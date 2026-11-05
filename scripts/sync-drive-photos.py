#!/usr/bin/env python3
"""Refresh the list of publicly shared images without storing the images."""
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

FOLDERS = [
    ("1yPqNa7F5y8LqtY2kMolfGJ9GdubVIccT", "public/drive-photos.json"),
]
class FolderParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.current = None
        self.ids = set()
        self.found_listing = False
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = attrs.get("class", "").split()
        if "flip-contents" in classes:
            self.found_listing = True
        match = re.fullmatch(r"entry-([\w-]+)", attrs.get("id", ""))
        if match:
            self.current = match.group(1)
        if tag == "img" and self.current and "/type/image/" in attrs.get("src", ""):
            self.ids.add(self.current)

for folder_id, output_path in FOLDERS:
    try:
        url = "https://drive.google.com/embeddedfolderview?" + urlencode({"id": folder_id})
        with urlopen(Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=30) as response:
            parser = FolderParser()
            parser.feed(response.read().decode("utf-8"))
        if not parser.found_listing:
            raise ValueError("Google Drive did not return the public folder listing")
        target = Path(output_path)
        temporary = target.with_suffix(".tmp")
        temporary.write_text(json.dumps({"photos": sorted(parser.ids)}) + "\n")
        temporary.replace(target)
        print(f"Found {len(parser.ids)} shared images for {output_path}")
    except Exception as error:
        # Preserve the checked-in list if Google is temporarily unreachable.
        print(f"Could not refresh {output_path}; keeping existing list: {error}", file=sys.stderr)
