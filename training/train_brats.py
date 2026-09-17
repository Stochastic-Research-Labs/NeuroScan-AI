"""
NeuroScan AI — Kaggle training script for BraTS 2021 Task 1 tumor sub-region segmentation.

USAGE ON KAGGLE
---------------
1. Create a new Kaggle Notebook, attach your BraTS 2021 Task 1 dataset as input, and turn on a
   GPU accelerator (Settings -> Accelerator -> GPU T4 x2 or P100).
2. Run `import os; os.listdir("/kaggle/input")` first to confirm the exact dataset folder name,
   then update DATA_ROOT below to match (see the comment next to it). You don't need to find the
   exact per-patient folder — pointing DATA_ROOT at the dataset's top-level folder is enough;
   `find_patient_cases()` below searches recursively at any depth.
3. Paste this entire file into one notebook cell (or upload it as a Kaggle Utility Script and
   `from train_brats import main`) and run it. Training logs print per epoch.
4. When it finishes, `/kaggle/working/model.pt` and `/kaggle/working/metrics.json` are ready to
   download from the notebook's Output panel.
5. Copy both files into `backend/models_store/` on your laptop and restart the backend.

A NOTE ON DATASET LAYOUT
-------------------------
Some Kaggle re-uploads of this dataset (especially ones you upload yourself from a local zip)
end up with each scan wrapped in its own folder — e.g. a directory literally named
`BraTS2021_00000_flair.nii/` containing a single file with an unrelated generated name like
`00000057_brain_flair.nii` inside it. This is a known artifact of how Kaggle's chunked upload
extracts large zips, not a problem with your data. `find_patient_cases()` handles both this
wrapped-folder layout and the standard flat-file layout automatically — you don't need to
reorganize anything.

This script deliberately has NO imports from the rest of the NeuroScan AI repo — Kaggle notebooks
can't easily import a sibling project's package — everything it needs is defined right here.
The `UNet3D` class below is a byte-for-byte copy of `backend/app/models/unet3d.py`. If you tune
the architecture (e.g. `BASE_CHANNELS`), change it in both places or the checkpoint you bring
home won't load.
"""

import json
import os
import random
import time
from pathlib import Path

import nibabel as nib
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, Dataset

# --------------------------------------------------------------------------------------
# CONFIG — the knobs you're most likely to want to change on Kaggle
# --------------------------------------------------------------------------------------

# Point this at (or above) the folder containing your patient scans. It doesn't need to be
# exact — find_patient_cases() searches recursively at any depth below this path, so pointing
# it at the whole attached dataset's root folder works fine too. Run
# `import os; print(os.listdir("/kaggle/input"))` to find the right top-level path.
DATA_ROOT = "/kaggle/input/datasets/mirzahamzamustafa/brain-tumor-dataset"

OUTPUT_DIR = "/kaggle/working"
MODEL_INPUT_SHAPE = (128, 128, 128)  # must match backend/app/core/config.py's MODEL_INPUT_SHAPE
BASE_CHANNELS = 16  # must match backend/app/models/unet3d.py's default
BATCH_SIZE = 1  # 128^3 x4 channels is memory-hungry; raise cautiously if your GPU has headroom
NUM_EPOCHS = 40
LEARNING_RATE = 1e-4
VAL_FRACTION = 0.1
VAL_EVERY_N_EPOCHS = 2
NUM_WORKERS = 2
SEED = 42

MODALITIES = ["t1", "t1ce", "t2", "flair"]
# BraTS label convention: 0=background, 1=NCR/NET, 2=ED, 4=ET. Channel order must match
# backend/app/core/config.py's CLASS_INFO `channel` field: [NCR, ED, ET].
CLASS_LABEL_VALUES = [1, 2, 4]
CLASS_NAMES = ["Necrotic Core (NCR/NET)", "Edema (ED)", "Enhancing Tumor (ET)"]
CLASS_KEYS = ["ncr", "ed", "et"]
CLASS_COLORS = ["#0EA5E9", "#FACC15", "#EF4444"]

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)


# --------------------------------------------------------------------------------------
# MODEL — identical to backend/app/models/unet3d.py
# --------------------------------------------------------------------------------------

# === UNET3D START ===
class ConvBlock(nn.Module):
    """Two 3x3x3 convolutions, each followed by InstanceNorm + LeakyReLU."""

    def __init__(self, in_channels: int, out_channels: int):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv3d(in_channels, out_channels, kernel_size=3, padding=1),
            nn.InstanceNorm3d(out_channels, affine=True),
            nn.LeakyReLU(negative_slope=0.01, inplace=True),
            nn.Conv3d(out_channels, out_channels, kernel_size=3, padding=1),
            nn.InstanceNorm3d(out_channels, affine=True),
            nn.LeakyReLU(negative_slope=0.01, inplace=True),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.block(x)


class Down(nn.Module):
    """Strided-conv downsample followed by a ConvBlock."""

    def __init__(self, in_channels: int, out_channels: int):
        super().__init__()
        self.downsample = nn.Conv3d(in_channels, in_channels, kernel_size=2, stride=2)
        self.conv = ConvBlock(in_channels, out_channels)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.conv(self.downsample(x))


class Up(nn.Module):
    """Transposed-conv upsample, concatenate with the encoder skip connection, then a ConvBlock."""

    def __init__(self, in_channels: int, skip_channels: int, out_channels: int):
        super().__init__()
        self.upsample = nn.ConvTranspose3d(in_channels, in_channels, kernel_size=2, stride=2)
        self.conv = ConvBlock(in_channels + skip_channels, out_channels)

    def forward(self, x: torch.Tensor, skip: torch.Tensor) -> torch.Tensor:
        x = self.upsample(x)
        x = torch.cat([x, skip], dim=1)
        return self.conv(x)


class UNet3D(nn.Module):
    """
    A compact 3D U-Net. `base_channels` controls capacity — 16 is deliberately modest so it
    trains reasonably fast on a single Kaggle GPU and can still run on CPU for local inference.
    Bump it (e.g. to 24 or 32) on Kaggle for better accuracy if you have GPU headroom, but do it
    in BOTH this file and training/train_brats.py.
    """

    def __init__(self, in_channels: int = 4, out_channels: int = 3, base_channels: int = 16):
        super().__init__()
        c = base_channels

        self.in_conv = ConvBlock(in_channels, c)
        self.down1 = Down(c, c * 2)
        self.down2 = Down(c * 2, c * 4)
        self.down3 = Down(c * 4, c * 8)
        self.down4 = Down(c * 8, c * 16)

        self.up1 = Up(c * 16, c * 8, c * 8)
        self.up2 = Up(c * 8, c * 4, c * 4)
        self.up3 = Up(c * 4, c * 2, c * 2)
        self.up4 = Up(c * 2, c, c)

        self.out_conv = nn.Conv3d(c, out_channels, kernel_size=1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x1 = self.in_conv(x)
        x2 = self.down1(x1)
        x3 = self.down2(x2)
        x4 = self.down3(x3)
        x5 = self.down4(x4)

        x = self.up1(x5, x4)
        x = self.up2(x, x3)
        x = self.up3(x, x2)
        x = self.up4(x, x1)

        return self.out_conv(x)  # raw logits — caller applies sigmoid
# === UNET3D END ===


# --------------------------------------------------------------------------------------
# PREPROCESSING — mirrors backend/app/services/preprocessing.py
# --------------------------------------------------------------------------------------


def zscore_normalize(volume: np.ndarray) -> np.ndarray:
    mask = volume > 0
    if not np.any(mask):
        return volume
    mean = volume[mask].mean()
    std = volume[mask].std()
    if std < 1e-6:
        std = 1.0
    normalized = np.zeros_like(volume, dtype=np.float32)
    normalized[mask] = (volume[mask] - mean) / std
    return normalized


def center_crop_or_pad(volume: np.ndarray, target_shape: tuple[int, int, int]) -> np.ndarray:
    """One-directional version of the backend's fit_to_shape (training never needs to invert
    this — predictions are only compared against ground truth that's been through the same
    fitting), but the crop/pad math is identical."""
    result = volume
    # crop oversized axes
    slices = []
    for o, t in zip(result.shape, target_shape):
        if o > t:
            start = (o - t) // 2
            slices.append(slice(start, start + t))
        else:
            slices.append(slice(None))
    result = result[tuple(slices)]
    # pad undersized axes
    pad_width = []
    for o, t in zip(result.shape, target_shape):
        if o < t:
            before = (t - o) // 2
            pad_width.append((before, t - o - before))
        else:
            pad_width.append((0, 0))
    result = np.pad(result, pad_width, mode="constant", constant_values=0)
    return result


# Order matters: check "t1ce" before "t1" so a t1ce file/folder doesn't get misread as plain t1.
_MODALITY_TOKENS = ["t1ce", "t1", "t2", "flair", "seg"]


def _modality_from_name(name: str) -> str | None:
    """Does `name` (a file or folder name) end in one of our modality tokens, right before a
    .nii or .nii.gz "extension"? Works whether that's a real file extension or just a folder
    named to look like one (see the module docstring's note on wrapped-folder layouts)."""
    lower = name.lower()
    for ext in (".nii.gz", ".nii"):
        if lower.endswith(ext):
            stem = lower[: -len(ext)]
            for token in _MODALITY_TOKENS:
                if stem.endswith(token):
                    return token
            return None
    return None


def _resolve_data_file(entry: Path) -> Path | None:
    """If `entry` is already a file, use it directly. If it's a directory (the wrapped-folder
    quirk described in the module docstring), use the first .nii/.nii.gz file found inside it."""
    if entry.is_file():
        return entry
    if entry.is_dir():
        candidates = sorted(entry.glob("*.nii.gz")) + sorted(entry.glob("*.nii"))
        return candidates[0] if candidates else None
    return None


def find_patient_cases(data_root: str) -> list[dict[str, Path]]:
    """Recursively search under `data_root` (at any depth, in any subfolder) for complete
    patient cases — a group of files/folders sharing a parent directory that together cover all
    four modalities plus a segmentation. Returns a list of dicts mapping
    "t1"/"t1ce"/"t2"/"flair"/"seg" -> the actual NIfTI file path for that case."""
    root = Path(data_root)
    if not root.exists():
        raise FileNotFoundError(
            f"DATA_ROOT '{data_root}' doesn't exist. Run `import os; print(os.listdir('/kaggle/input'))` "
            "to find the correct path and update DATA_ROOT at the top of this script."
        )

    groups: dict[Path, dict[str, Path]] = {}
    for dirpath, dirnames, filenames in os.walk(root):
        current = Path(dirpath)
        for name in list(dirnames) + list(filenames):
            modality = _modality_from_name(name)
            if not modality:
                continue
            resolved = _resolve_data_file(current / name)
            if resolved is None:
                continue
            groups.setdefault(current, {}).setdefault(modality, resolved)

    complete = [g for g in groups.values() if all(m in g for m in MODALITIES) and "seg" in g]

    if not complete:
        total_matches = sum(len(g) for g in groups.values())
        raise RuntimeError(
            f"No complete patient cases found under '{data_root}'.\n"
            f"Scanned the whole tree and found {len(groups)} folder(s) with at least one "
            f"recognizable modality file ({total_matches} matches total), but none had all of "
            "t1 + t1ce + t2 + flair + seg together in one place.\n"
            "Inspect the actual layout with:\n"
            f"  import os\n  for root, dirs, files in os.walk(r'{data_root}'):\n"
            "      print(root, dirs[:5], files[:5])\n"
        )
    return sorted(complete, key=lambda g: str(g[MODALITIES[0]]))


class BraTSDataset(Dataset):
    def __init__(self, cases: list[dict[str, Path]], target_shape: tuple[int, int, int]):
        self.cases = cases
        self.target_shape = target_shape

    def __len__(self) -> int:
        return len(self.cases)

    def __getitem__(self, idx: int):
        case = self.cases[idx]

        modality_volumes = []
        for modality in MODALITIES:
            data = np.asarray(nib.load(str(case[modality])).dataobj, dtype=np.float32)
            data = zscore_normalize(data)
            data = center_crop_or_pad(data, self.target_shape)
            modality_volumes.append(data)
        input_array = np.stack(modality_volumes, axis=0)  # (4, D, H, W)

        seg = np.asarray(nib.load(str(case["seg"])).dataobj, dtype=np.uint8)
        seg = center_crop_or_pad(seg, self.target_shape)
        target_array = np.stack([(seg == v).astype(np.float32) for v in CLASS_LABEL_VALUES], axis=0)

        return torch.from_numpy(input_array), torch.from_numpy(target_array)


# --------------------------------------------------------------------------------------
# LOSS + METRICS
# --------------------------------------------------------------------------------------


def dice_loss(logits: torch.Tensor, targets: torch.Tensor, eps: float = 1e-5) -> torch.Tensor:
    probs = torch.sigmoid(logits)
    dims = (0, 2, 3, 4)
    intersection = torch.sum(probs * targets, dim=dims)
    union = torch.sum(probs, dim=dims) + torch.sum(targets, dim=dims)
    dice = (2 * intersection + eps) / (union + eps)
    return 1 - dice.mean()


def combined_loss(logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
    bce = F.binary_cross_entropy_with_logits(logits, targets)
    return bce + dice_loss(logits, targets)


@torch.no_grad()
def dice_score_per_class(logits: torch.Tensor, targets: torch.Tensor, eps: float = 1e-5) -> list[float]:
    probs = (torch.sigmoid(logits) > 0.5).float()
    dims = (0, 2, 3, 4)
    intersection = torch.sum(probs * targets, dim=dims)
    union = torch.sum(probs, dim=dims) + torch.sum(targets, dim=dims)
    dice = (2 * intersection + eps) / (union + eps)
    return dice.cpu().tolist()


# --------------------------------------------------------------------------------------
# TRAINING LOOP
# --------------------------------------------------------------------------------------


def main() -> None:
    set_seed(SEED)
    print(f"Device: {DEVICE}")

    patient_cases = find_patient_cases(DATA_ROOT)
    print(f"Found {len(patient_cases)} complete patient cases")

    random.shuffle(patient_cases)
    n_val = max(1, int(len(patient_cases) * VAL_FRACTION))
    val_cases = patient_cases[:n_val]
    train_cases = patient_cases[n_val:]
    print(f"Train: {len(train_cases)}  Val: {len(val_cases)}")

    train_ds = BraTSDataset(train_cases, MODEL_INPUT_SHAPE)
    val_ds = BraTSDataset(val_cases, MODEL_INPUT_SHAPE)
    train_loader = DataLoader(
        train_ds, batch_size=BATCH_SIZE, shuffle=True, num_workers=NUM_WORKERS, pin_memory=True
    )
    val_loader = DataLoader(
        val_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=NUM_WORKERS, pin_memory=True
    )

    model = UNet3D(in_channels=len(MODALITIES), out_channels=len(CLASS_LABEL_VALUES), base_channels=BASE_CHANNELS)
    model.to(DEVICE)

    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=NUM_EPOCHS)
    scaler = torch.cuda.amp.GradScaler(enabled=DEVICE == "cuda")

    history = {"epochs": [], "train_loss": [], "val_loss": []}
    last_val_dice = [0.0, 0.0, 0.0]

    for epoch in range(1, NUM_EPOCHS + 1):
        epoch_start = time.time()
        model.train()
        running_loss = 0.0
        for inputs, targets in train_loader:
            inputs, targets = inputs.to(DEVICE), targets.to(DEVICE)
            optimizer.zero_grad(set_to_none=True)
            with torch.cuda.amp.autocast(enabled=DEVICE == "cuda"):
                logits = model(inputs)
                loss = combined_loss(logits, targets)
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
            running_loss += loss.item() * inputs.size(0)
        train_loss = running_loss / max(1, len(train_ds))
        scheduler.step()

        val_loss = train_loss
        if epoch % VAL_EVERY_N_EPOCHS == 0 or epoch == NUM_EPOCHS:
            model.eval()
            running_val_loss = 0.0
            dice_accum = np.zeros(len(CLASS_LABEL_VALUES))
            n_batches = 0
            with torch.no_grad():
                for inputs, targets in val_loader:
                    inputs, targets = inputs.to(DEVICE), targets.to(DEVICE)
                    with torch.cuda.amp.autocast(enabled=DEVICE == "cuda"):
                        logits = model(inputs)
                        loss = combined_loss(logits, targets)
                    running_val_loss += loss.item() * inputs.size(0)
                    dice_accum += np.array(dice_score_per_class(logits, targets))
                    n_batches += 1
            val_loss = running_val_loss / max(1, len(val_ds))
            last_val_dice = (dice_accum / max(1, n_batches)).tolist()

        history["epochs"].append(epoch)
        history["train_loss"].append(round(train_loss, 4))
        history["val_loss"].append(round(val_loss, 4))

        elapsed = time.time() - epoch_start
        print(
            f"Epoch {epoch:03d}/{NUM_EPOCHS} | train_loss={train_loss:.4f} | val_loss={val_loss:.4f} "
            f"| dice(NCR/ED/ET)={[round(d, 3) for d in last_val_dice]} | {elapsed:.1f}s"
        )

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    checkpoint_path = os.path.join(OUTPUT_DIR, "model.pt")
    torch.save({"model_state_dict": model.state_dict(), "base_channels": BASE_CHANNELS}, checkpoint_path)
    print(f"Saved checkpoint to {checkpoint_path}")

    metrics_payload = {
        "demo_mode": False,
        "epochs": history["epochs"],
        "train_loss": history["train_loss"],
        "val_loss": history["val_loss"],
        "dice_per_class": [
            {"label": name, "key": key, "dice": round(float(dice), 4), "color": color}
            for name, key, color, dice in zip(CLASS_NAMES, CLASS_KEYS, CLASS_COLORS, last_val_dice)
        ],
        "notes": f"Trained on {len(train_cases)} cases, validated on {len(val_cases)}, {NUM_EPOCHS} epochs.",
    }
    metrics_path = os.path.join(OUTPUT_DIR, "metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics_payload, f, indent=2)
    print(f"Saved metrics to {metrics_path}")
    print("\nDownload both files from the Kaggle notebook's Output panel, then copy them into "
          "backend/models_store/ on your laptop and restart the backend.")


if __name__ == "__main__":
    main()
