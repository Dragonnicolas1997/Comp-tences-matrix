import io
import re
import pdfplumber


def extract_text_from_pdf(file_path_or_bytes) -> str:
    """Extract ALL text content from a PDF file, including tables.

    Handles: paragraphs, tables, multi-page documents.

    Args:
        file_path_or_bytes: Either a file path (str) or raw bytes of the PDF file.

    Returns:
        Concatenated text from all pages, with page separators.
    """
    if isinstance(file_path_or_bytes, bytes):
        source = io.BytesIO(file_path_or_bytes)
    else:
        source = file_path_or_bytes

    all_text = []

    with pdfplumber.open(source) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            page_texts = []

            # Extract main text content
            text = page.extract_text()
            if text and text.strip():
                page_texts.append(text.strip())

            # Extract tables separately (may contain structured data not in main text)
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    row_texts = [cell.strip() for cell in row if cell and cell.strip()]
                    if row_texts:
                        page_texts.append(" | ".join(row_texts))

            if page_texts:
                all_text.append(f"\n--- Page {page_num} ---")
                all_text.extend(page_texts)

    result = "\n".join(all_text)

    # Clean up excessive whitespace while preserving structure
    result = re.sub(r'\n{3,}', '\n\n', result)

    # Fix mojibake: if UTF-8 text was decoded as Windows-1252, re-encode properly
    try:
        fixed = result.encode('cp1252').decode('utf-8')
        result = fixed
    except (UnicodeDecodeError, UnicodeEncodeError):
        pass  # Not mojibake, keep original

    return result
