import { Brain, Database, Layers3, ScanEye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export const metadata = { title: "About — NeuroScan AI" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/30 mb-4">
          <Brain size={22} aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-semibold text-text tracking-tight">About NeuroScan AI</h1>
        <p className="mt-3 text-sm text-text-muted leading-relaxed">
          NeuroScan AI is a local, single-user tool for exploring automated brain tumor
          segmentation on multi-modal MRI. It was built by <strong className="text-text">Hamza
          Mustafa</strong> as an end-to-end project spanning dataset preparation, model training,
          and an interactive viewer — with training run on Kaggle GPUs and everything else
          running entirely on the local machine.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database size={16} className="text-primary" aria-hidden="true" /> The dataset
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-text-muted leading-relaxed space-y-2">
          <p>
            <a
              href="https://www.kaggle.com/datasets/dschettler8845/brats-2021-task1"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-2"
            >
              BraTS 2021 Task 1
            </a>{" "}
            provides pre-operative MRI scans from multiple institutions, each with four co-registered
            modalities — T1, T1-CE (contrast enhanced), T2, and FLAIR — and, for the training set,
            expert-annotated tumor sub-region labels.
          </p>
          <p>
            Every voxel is labeled as background, necrotic/non-enhancing tumor core (NCR/NET,
            label 1), peritumoral edema (ED, label 2), or enhancing tumor (ET, label 4). Whole
            Tumor (WT) and Tumor Core (TC) are derived unions of these labels used for evaluation.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers3 size={16} className="text-primary" aria-hidden="true" /> The model
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-text-muted leading-relaxed space-y-2">
          <p>
            A 3D U-Net takes all four modalities stacked as input channels and predicts three
            output channels — one per tumor sub-region — using a sigmoid activation so regions can
            overlap (an enhancing-tumor voxel is also part of the tumor core, which is also part
            of the whole tumor). Training happens on Kaggle GPU notebooks using the script
            in <code className="mono-numeric">training/train_brats.py</code>; the resulting
            checkpoint is copied to this machine and loaded by the local FastAPI backend.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanEye size={16} className="text-primary" aria-hidden="true" /> The viewer
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-text-muted leading-relaxed">
          <p>
            Scans are rendered client-side with{" "}
            <a
              href="https://github.com/niivue/niivue"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-2"
            >
              NiiVue
            </a>
            , a WebGL2 NIfTI viewer, so you can scroll through axial, coronal, and sagittal slices
            and toggle the predicted segmentation as a translucent color overlay directly on the
            raw scan.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-xs text-text-muted pt-2">
        <span>Runs locally — data is not sent to a cloud service. Research and visualization use only; not for clinical diagnosis or treatment decisions.</span>
      </div>
    </div>
  );
}
