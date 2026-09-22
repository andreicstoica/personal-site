"""Serve a fine-tune on Modal with vLLM, billed only while a GPU is up.

Modal stays deployed and scales to zero. You pay per second of GPU time, not
for a VM that has to be manually paused. The Starter plan includes a monthly
compute credit. A small model on an L4 (about $0.80/hr) with a few minutes of
idle before shutdown fits a personal site inside that credit unless traffic
is heavy.

Cold start: the first request after shutdown can 503 until vLLM is listening.
andrei.bio retries those and answers from markdown notes if the wake runs long.
FAST_BOOT skips CUDA graphs so boots stay shorter. Weights live on a Volume
so the second boot does not re-download from Hugging Face.

Setup:
  pip install modal
  modal setup
  # private weights only:
  modal secret create huggingface HF_TOKEN=hf_...
  export MODEL_NAME=noodlesGS/personal
  export MODEL_REVISION=main
  export GPU=L4
  export HF_TOKEN_SECRET=huggingface   # omit for a public repo
  export VLLM_API_KEY=...              # optional, sent as Bearer by the site
  modal deploy inference/modal_app.py

Then set on the site (Vercel):
  MODEL_PROVIDER=modal
  MODAL_API_URL=https://<workspace>--andrei-guide-server.<region>.modal.direct
  MODAL_MODEL_ID=<served model name>
  MODAL_PROXY_KEY / MODAL_PROXY_SECRET   # dashboard proxy tokens
  MODAL_API_KEY                          # only if VLLM_API_KEY was set

Leave min_containers at 0. Setting it to 1 bills the GPU all month.
scaledown_window=180 keeps a conversation warm, then the GPU shuts off.
"""

from __future__ import annotations

import os
import subprocess

import modal

MODEL_NAME = os.environ.get("MODEL_NAME", "noodlesGS/personal")
MODEL_REVISION = os.environ.get("MODEL_REVISION", "").strip()
SERVED_NAME = os.environ.get("SERVED_NAME", MODEL_NAME)
GPU = os.environ.get("GPU", "L4")
VLLM_API_KEY = os.environ.get("VLLM_API_KEY", "").strip()
HF_TOKEN_SECRET = os.environ.get("HF_TOKEN_SECRET", "").strip()
# Public only if you accept anyone with the URL being able to spend GPU time.
PUBLIC = os.environ.get("MODAL_PUBLIC", "false").lower() == "true"

VLLM_PORT = 8000
MINUTES = 60

vllm_image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.9.0-devel-ubuntu22.04",
        add_python="3.12",
    )
    .entrypoint([])
    .uv_pip_install("vllm==0.21.0")
    .env({"HF_XET_HIGH_PERFORMANCE": "1"})
)

hf_cache = modal.Volume.from_name("andrei-hf-cache", create_if_missing=True)
vllm_cache = modal.Volume.from_name("andrei-vllm-cache", create_if_missing=True)

secrets: list[modal.Secret] = []
if HF_TOKEN_SECRET:
    secrets.append(modal.Secret.from_name(HF_TOKEN_SECRET))

app = modal.App("andrei-guide")


@app.server(
    image=vllm_image,
    gpu=GPU,
    scaledown_window=3 * MINUTES,
    startup_timeout=10 * MINUTES,
    min_containers=0,
    max_containers=1,
    volumes={
        "/root/.cache/huggingface": hf_cache,
        "/root/.cache/vllm": vllm_cache,
    },
    secrets=secrets,
    port=VLLM_PORT,
    target_concurrency=8,
    unauthenticated=PUBLIC,
)
class Server:
    @modal.enter()
    def start(self) -> None:
        cmd = [
            "vllm",
            "serve",
            MODEL_NAME,
            "--served-model-name",
            SERVED_NAME,
            "--host",
            "0.0.0.0",
            "--port",
            str(VLLM_PORT),
            "--enforce-eager",
        ]
        if MODEL_REVISION:
            cmd += ["--revision", MODEL_REVISION]
        if VLLM_API_KEY:
            cmd += ["--api-key", VLLM_API_KEY]
        self.process = subprocess.Popen(cmd)

    @modal.exit()
    def stop(self) -> None:
        self.process.terminate()
