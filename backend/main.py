from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from pathlib import Path
import uvicorn
from pydantic import BaseModel
from typing import List, Optional
import glob

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Image(BaseModel):
    src: str
    alt: str

class PhotoSet(BaseModel):
    name: str
    images: List[Image]

PICTURES_DIR = "../src/assets/pictures"

app.mount("/images", StaticFiles(directory=PICTURES_DIR), name="images")

@app.get("/")
async def read_root():
    return {"message": "Photo Frame API"}

@app.get("/api/photosets", response_model=List[PhotoSet])
async def get_photo_sets():
    try:
        photo_sets = []
        
        subdirs = [f for f in os.listdir(PICTURES_DIR) if os.path.isdir(os.path.join(PICTURES_DIR, f))]
        
        for subdir in subdirs:
            subdir_path = os.path.join(PICTURES_DIR, subdir)
            images = []
            
            image_files = []
            for ext in ["*.jpg", "*.jpeg", "*.png", "*.gif"]:
                image_files.extend(glob.glob(os.path.join(subdir_path, ext)))
            
            for image_file in image_files:
                file_name = os.path.basename(image_file)
                alt = os.path.splitext(file_name)[0].replace("-", " ")
                rel_path = os.path.relpath(image_file, PICTURES_DIR)
                images.append(Image(
                    src=f"/images/{rel_path}",
                    alt=alt
                ))
            
            if images:
                photo_sets.append(PhotoSet(
                    name=subdir.capitalize(),
                    images=images
                ))
        
        return photo_sets
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/refresh")
async def refresh_photo_sets():
    return {"status": "success", "message": "Refresh triggered"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
