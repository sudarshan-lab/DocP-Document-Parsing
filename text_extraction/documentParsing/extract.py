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

def preprocess_image(image_path):
    # Open the image using OpenCV
    img = cv2.imread(image_path)

    # Convert the image to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Apply adaptive thresholding for better results
    thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)

    # Perform morphological transformations to clean up the image
    kernel = np.ones((3, 3), np.uint8)
    opening = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations=2)
    sure_bg = cv2.dilate(opening, kernel, iterations=3)

    return sure_bg

def extractTextAfterPreProcessing(image_path):
    # Preprocess the image
    preprocessed_img = preprocess_image(image_path)

    # Save the preprocessed image (optional, for debugging)
    cv2.imwrite("preprocessed_image.png", preprocessed_img)

    extractedText = pytesseract.image_to_string(preprocessed_img)

    return extractedText