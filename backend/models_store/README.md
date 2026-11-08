# models_store/

Drop your Kaggle-trained files here:

- `model.pt` — the trained checkpoint (either a raw `state_dict()` or a dict containing a
  `model_state_dict` key — both are accepted by `app/services/inference.py`)
- `metrics.json` — training/validation loss curves and per-class Dice scores

Both are produced automatically at the end of `training/train_brats.py`. Nothing else needs to
change — restart the backend (`uvicorn app.main:app --reload --port 8000`) and it will pick them
up automatically, switching the whole app out of demo mode.

This directory is gitignored (see the root `.gitignore`) since checkpoints are large binaries
that don't belong in version control.
