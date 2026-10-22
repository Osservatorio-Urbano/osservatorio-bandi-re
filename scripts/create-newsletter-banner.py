#!/usr/bin/env python3
"""
Generatore Banner Istituzionale Newsletter
Comune di Reggio Emilia · Osservatorio Bandi Edizione settimanale
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1240, 320

# 1. Foto Palazzo dei Musei / Giardini Pubblici
script_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(script_dir)
public_dir = os.path.join(root_dir, 'public')

# Crea base
photo_path = os.path.join(public_dir, 'newsletter-header-banner.png')
# Utilizza Titillium Web se disponibile, fallback a font di sistema
font_title_path = os.path.join(public_dir, 'TitilliumWeb-Bold.ttf')
font_sub_path = os.path.join(public_dir, 'TitilliumWeb-SemiBold.ttf')
font_reg_path = os.path.join(public_dir, 'TitilliumWeb-Regular.ttf')

if not os.path.exists(font_title_path):
    font_title_path = 'C:/Windows/Fonts/segoeuib.ttf'
    font_sub_path = 'C:/Windows/Fonts/segoeui.ttf'
    font_reg_path = 'C:/Windows/Fonts/segoeui.ttf'

font_kicker = ImageFont.truetype(font_sub_path, 17)
font_title = ImageFont.truetype(font_title_path, 44)
font_sub = ImageFont.truetype(font_sub_path, 25)
font_badge = ImageFont.truetype(font_reg_path, 17)

print("Banner asset configurato.")
