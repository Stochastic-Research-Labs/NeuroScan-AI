"""
3D U-Net for multi-label BraTS tumor sub-region segmentation.

IMPORTANT: this class is intentionally duplicated (byte-for-byte, between the
`# === UNET3D START ===` / `# === UNET3D END ===` markers) in `training/train_brats.py` so a
checkpoint trained on Kaggle loads into this backend with zero conversion. If you change the
architecture here, copy the same change into the training script, or the checkpoint's
`state_dict` keys/shapes will no longer match and `load_state_dict` will raise.

Input:  (B, 4, D, H, W)  — stacked T1, T1-CE, T2, FLAIR
Output: (B, 3, D, H, W)  — raw logits for NCR/NET, ED, ET (apply sigmoid, not softmax: the
                           regions overlap, they are not mutually exclusive classes)
"""

# === UNET3D START ===
import torch
import torch.nn as nn


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
