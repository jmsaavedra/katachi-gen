#!/usr/bin/env python3

"""
Extract assets from old Katachi Gen HTML file
"""

import sys
import json
import re
from pathlib import Path

def extract_assets(html_path):
    """Extract pattern type, wallet, seed, and images from old HTML"""

    with open(html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()

    # Extract wallet address from filename
    wallet_match = re.search(r'-(0x[a-fA-F0-9]{40})-', str(html_path))
    wallet_address = wallet_match.group(1) if wallet_match else '0xee49f82e58a1c2b306720d0c68047cbf70c11fb5'

    # Extract pattern type from dataToProcess
    pattern_match = re.search(r'patternType\s*:\s*["\']([^"\']+)["\']', html_content)
    pattern_type = pattern_match.group(1) if pattern_match else 'flower'

    # Extract seed
    seed_match = re.search(r'seed2\s*:\s*["\']([^"\']+)["\']', html_content)
    seed2 = seed_match.group(1) if seed_match else f'{wallet_address}_recreated'

    # Extract base64 images from dataToProcess.images array
    # Look for pattern: images: [{url: "data:image/...", ...}, ...]
    images_section_match = re.search(r'images\s*:\s*\[([^\]]+)\]', html_content, re.DOTALL)

    images = []
    if images_section_match:
        images_content = images_section_match.group(1)
        # Find all data:image URLs in the images array
        image_urls = re.findall(r'url\s*:\s*["\']?(data:image/[^"\']+)["\']?', images_content)

        for idx, img_url in enumerate(image_urls):
            # Clean up the URL (remove any trailing characters)
            img_url = img_url.split('"')[0].split("'")[0]
            images.append({
                'index': idx,
                'base64': img_url,
                'name': f'NFT Image {idx}'
            })

    result = {
        'walletAddress': wallet_address,
        'pattern': pattern_type,
        'seed2': seed2,
        'imageCount': len(images),
        'images': images
    }

    return result

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python extract-html-assets.py <path-to-html>")
        sys.exit(1)

    html_path = sys.argv[1]
    result = extract_assets(html_path)

    print(json.dumps(result, indent=2))

    # Also save to a file
    output_file = Path(__file__).parent.parent / 'temp' / 'extracted-assets.json'
    output_file.parent.mkdir(parents=True, exist_ok=True)

    with open(output_file, 'w') as f:
        json.dump(result, f, indent=2)

    print(f"\n✅ Extracted {result['imageCount']} images")
    print(f"📝 Saved to: {output_file}")
