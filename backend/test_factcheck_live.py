import os
import sys
import time
from unittest.mock import patch, MagicMock
import requests

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.core.config import settings
from app.services.factcheck_cache import factcheck_cache
from app.services.factcheck_service import search_google_factcheck, evaluate_single_claim
from app.services.nlp_analyzer import extract_raw_claims, analyze_text_content

# Sample Google Fact Check Tools API responses for testing
SAMPLE_GOOGLE_RESPONSE_FALSE = {
    "claims": [
        {
            "text": "The Moon will completely disappear from the night sky next Tuesday.",
            "claimant": "Viral social media posts",
            "claimDate": "2024-05-10T00:00:00Z",
            "claimReview": [
                {
                    "publisher": {
                        "name": "PolitiFact",
                        "site": "politifact.com"
                    },
                    "url": "https://www.politifact.com/factchecks/2024/moon-disappearing-hoax/",
                    "title": "Viral posts falsely claim the moon will disappear from Earth orbit",
                    "reviewDate": "2024-05-11T12:00:00Z",
                    "textualRating": "False",
                    "languageCode": "en"
                }
            ]
        }
    ]
}

SAMPLE_GOOGLE_RESPONSE_TRUE = {
    "claims": [
        {
            "text": "NASA launched the Europa Clipper mission to investigate Jupiter's icy moon.",
            "claimant": "NASA News Release",
            "claimDate": "2024-10-14T00:00:00Z",
            "claimReview": [
                {
                    "publisher": {
                        "name": "Reuters Fact Check",
                        "site": "reuters.com"
                    },
                    "url": "https://www.reuters.com/fact-check/nasa-europa-clipper-launch/",
                    "title": "NASA Europa Clipper launch confirmed and verified",
                    "reviewDate": "2024-10-15T09:00:00Z",
                    "textualRating": "True",
                    "languageCode": "en"
                }
            ]
        }
    ]
}


def test_01_api_key_loaded_from_env():
    factcheck_key = getattr(settings, "GOOGLE_FACTCHECK_API_KEY", None)
    # Check that settings can read the key without revealing its secret content in logs
    assert factcheck_key is not None or getattr(settings, "GEMINI_API_KEY", None) is not None, "API Key should be configured in settings"
    print("[OK] Test 1 Passed: API key configured in settings (never exposed).")


def test_02_successful_google_factcheck_response():
    factcheck_cache.clear()
    with patch("requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = SAMPLE_GOOGLE_RESPONSE_FALSE
        mock_get.return_value = mock_resp

        results = search_google_factcheck("The Moon will disappear next Tuesday")
        assert results is not None
        assert len(results) == 1
        item = results[0]
        assert item["source_name"] == "PolitiFact"
        assert item["rating"] == "False"
        assert item["claimant"] == "Viral social media posts"
        assert item["is_live_api"] is True
        assert "politifact.com" in item["url"]
        print("[OK] Test 2 Passed: Successful Google Fact Check response parsed with all metadata fields.")


def test_03_no_result_response():
    factcheck_cache.clear()
    with patch("requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"claims": []}
        mock_get.return_value = mock_resp

        results = search_google_factcheck("A completely obscure non-existent claim that has never been fact checked 12345")
        assert results is None, "Should return None when Google has no matching fact checks"
        print("[OK] Test 3 Passed: No-result response handled gracefully.")


def test_04_api_failure_handling():
    factcheck_cache.clear()
    with patch("requests.get") as mock_get:
        for status in [400, 403, 429, 500]:
            mock_resp = MagicMock()
            mock_resp.status_code = status
            mock_get.return_value = mock_resp

            results = search_google_factcheck(f"Failing status code claim test {status}")
            assert results is None, f"Should return None on HTTP {status} without crashing"
    print("[OK] Test 4 Passed: API HTTP failure codes (400, 403, 429, 500) handled gracefully.")


def test_05_missing_or_invalid_api_key():
    factcheck_cache.clear()
    with patch.object(settings, "GOOGLE_FACTCHECK_API_KEY", None), \
         patch.object(settings, "GEMINI_API_KEY", None), \
         patch("requests.get") as mock_get:
        results = search_google_factcheck("Some claim with missing API key")
        assert results is None
        assert mock_get.call_count == 0, "Network should not be contacted when key is missing"
    print("[OK] Test 5 Passed: Missing/empty API key returns None without network attempt.")


def test_06_network_timeout_handling():
    factcheck_cache.clear()
    with patch("requests.get", side_effect=requests.exceptions.Timeout("Connection timed out")):
        results = search_google_factcheck("Claim that triggers network timeout")
        assert results is None, "Timeout should return None without crashing application"
    print("[OK] Test 6 Passed: Network timeout handled safely.")


def test_07_cache_hit_prevents_network_call():
    factcheck_cache.clear()
    with patch("requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = SAMPLE_GOOGLE_RESPONSE_FALSE
        mock_get.return_value = mock_resp

        query = "Identical claim for cache hit verification"
        res1 = search_google_factcheck(query)
        assert mock_get.call_count == 1
        assert res1 is not None

        # Second identical request (and slight formatting variation)
        res2 = search_google_factcheck(f'"{query}."')
        assert mock_get.call_count == 1, "Cache hit must NOT make a second network call"
        assert res2 is not None
        assert res2[0]["rating"] == res1[0]["rating"]
        assert factcheck_cache.hits >= 1
    print("[OK] Test 7 Passed: Cache hit successfully serves 24-hour cached response without network request.")


def test_08_cache_expiry():
    factcheck_cache.clear()
    with patch("requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = SAMPLE_GOOGLE_RESPONSE_TRUE
        mock_get.return_value = mock_resp

        query = "Claim to test expiration lifecycle"
        # Cache with a simulated tiny TTL (0.1 seconds)
        factcheck_cache.set(query, SAMPLE_GOOGLE_RESPONSE_TRUE["claims"][0]["claimReview"], ttl=0.1)
        assert factcheck_cache.get(query) is not None

        # Wait for expiration
        time.sleep(0.15)
        assert factcheck_cache.get(query) is None, "Expired entry must return None and be evicted"
    print("[OK] Test 8 Passed: Cache expiry correctly invalidates stale entries.")


def test_09_duplicate_claims_not_duplicated():
    raw_text = (
        "Breaking news: The moon will disappear next month! "
        "The moon will disappear next month. "
        "The moon will disappear next month. "
        "Please subscribe to our newsletter and click here!"
    )
    claims = extract_raw_claims(raw_text)
    # The duplicate sentences and newsletter CTA should be filtered
    assert len(claims) == 1, f"Expected 1 unique claim, got: {claims}"
    assert "subscribe" not in claims[0].lower()
    print("[OK] Test 9 Passed: Duplicate claims and non-factual CTA fragments filtered out.")


def test_10_offline_fallback_preservation():
    factcheck_cache.clear()
    # With Google API returning no results (or disabled), local knowledge base must kick in
    with patch("requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"claims": []}
        mock_get.return_value = mock_resp

        # Test local domain knowledge: Mars breathing
        eval_result = evaluate_single_claim("Humans can breathe comfortably on Mars without any spacesuit")
        assert eval_result["status"] == "contradicted"
        assert "NASA Jet Propulsion Laboratory" in eval_result["evidence"][0]["source_name"]

        # Test local domain knowledge: Moon vanishing
        eval_result2 = evaluate_single_claim("The moon will vanish from orbit completely")
        assert eval_result2["status"] == "contradicted"

        # Test accredited primary source: Reuters report
        eval_result3 = evaluate_single_claim("Reuters confirmed new agricultural trade figures for 2024")
        assert eval_result3["status"] == "supported"
    print("[OK] Test 10 Passed: Offline domain registry and accredited agency heuristics work seamlessly.")


def test_11_verdict_integration():
    factcheck_cache.clear()
    # Scenario A: Live Google Fact Check contradicts a claim
    with patch("requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = SAMPLE_GOOGLE_RESPONSE_FALSE
        mock_get.return_value = mock_resp

        article = analyze_text_content("Social media warns that the moon will completely disappear from the night sky next Tuesday.")
        assert article["verdict"] == "fake"
        assert article["confidence"] >= 75
        assert len(article["detailed_claims"]) >= 1
        claim_ev = article["detailed_claims"][0]["evidence"][0]
        assert claim_ev["is_live_api"] is True
        assert claim_ev["rating"] == "False"

    # Scenario B: Live Google Fact Check verifies a claim
    factcheck_cache.clear()
    with patch("requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = SAMPLE_GOOGLE_RESPONSE_TRUE
        mock_get.return_value = mock_resp

        article = analyze_text_content("NASA launched the Europa Clipper mission to investigate Jupiter's icy moon.")
        assert article["verdict"] == "real"
        assert article["confidence"] >= 75
        claim_ev = article["detailed_claims"][0]["evidence"][0]
        assert claim_ev["is_live_api"] is True
        assert claim_ev["rating"] == "True"

    print("[OK] Test 11 Passed: Verdict engine integrates live fact-check evidence into Real/Fake classifications.")


if __name__ == "__main__":
    print("==================================================")
    print("RUNNING PHASE 2A: LIVE FACT-CHECKING TEST SUITE")
    print("==================================================")
    test_01_api_key_loaded_from_env()
    test_02_successful_google_factcheck_response()
    test_03_no_result_response()
    test_04_api_failure_handling()
    test_05_missing_or_invalid_api_key()
    test_06_network_timeout_handling()
    test_07_cache_hit_prevents_network_call()
    test_08_cache_expiry()
    test_09_duplicate_claims_not_duplicated()
    test_10_offline_fallback_preservation()
    test_11_verdict_integration()
    print("\n==================================================")
    print("ALL 11 PHASE 2A FACT-CHECKING TESTS PASSED!")
    print("==================================================")
