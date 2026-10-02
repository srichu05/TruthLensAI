import ipaddress
from urllib.parse import urlparse
import httpx
from bs4 import BeautifulSoup
from typing import Tuple, Optional

BLOCKED_HOSTS = {
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "metadata.google.internal",
    "169.254.169.254",
}

def validate_public_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("Only http:// and https:// URLs are supported.")
    
    hostname = parsed.hostname
    if not hostname:
        raise ValueError("Invalid URL: missing hostname.")
    
    if hostname.lower() in BLOCKED_HOSTS:
        raise ValueError("Access to local/loopback network addresses is prohibited.")
        
    try:
        ip_obj = ipaddress.ip_address(hostname)
        if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local or ip_obj.is_reserved:
            raise ValueError("Access to private/local IP addresses is prohibited.")
    except ValueError as e:
        if "prohibited" in str(e):
            raise
        # Normal public domain name

async def extract_article_from_url(url: str) -> Tuple[str, str]:
    """
    Extracts the headline and main body text from an article URL with SSRF protection.
    Returns: (title, content)
    """
    validate_public_url(url)
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 "
            "TruthLensAI/2.4 (https://truthlens.ai; research@truthlens.ai)"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
    
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True, headers=headers) as client:
        response = await client.get(url)
        response.raise_for_status()
        
    soup = BeautifulSoup(response.text, "html.parser")
    
    # Remove script, style, nav, footer tags
    for tag in soup(["script", "style", "nav", "footer", "header", "aside", "noscript"]):
        tag.decompose()
        
    # Get Title
    title = ""
    if soup.find("h1"):
        title = soup.find("h1").get_text(strip=True)
    elif soup.title:
        title = soup.title.get_text(strip=True)
        
    # Extract article text from lead paragraphs (up to 15 to capture core journalistic context)
    paragraphs = soup.find_all("p")
    content_parts = [p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 25][:15]
    
    content = " ".join(content_parts)
    if not content:
        content = soup.get_text(separator=" ", strip=True)[:3000]
        
    return title or "Extracted Web Article", content
