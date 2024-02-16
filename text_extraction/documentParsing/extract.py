import numpy as np
import pandas as pd
import cv2
import PIL
import pytesseract
from pdf2image import convert_from_path


def extractionUsingPillow(filePath):
    images = convert_from_path(filePath)
    grey_image_pil = PIL.ImageOps.grayscale(images[0])
    text_from_grey_image = pytesseract.image_to_string(grey_image_pil)
    return text_from_grey_image

def extractionUsingOpenCV(filePath):
    doc_img = cv2.imread(filePath)
    text_from_cv = pytesseract.image_to_string(doc_img)
    return text_from_cv
