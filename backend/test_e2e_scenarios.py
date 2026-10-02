import os
import sys
import pytest
from unittest.mock import patch, MagicMock

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.services.factcheck_cache import factcheck_cache
from app.services.nlp_analyzer import analyze_text_content, extract_raw_claims
from app.services.web_scraper import extract_article_from_url

# Mock responses for deterministic testing
MOCK_TRUE_EVIDENCE = [
    {
        "source_name": "Reuters Fact Check",
        "title": "NASA Europa Clipper launch confirmed and verified",
        "date": "2024-10-15",
        "summary": "NASA launched the Europa Clipper mission on a Falcon Heavy rocket.",
        "url": "https://www.reuters.com/fact-check/nasa-europa-clipper-launch/",
        "rating": "True",
        "claim": "NASA launched the Europa Clipper spacecraft",
        "claimant": "NASA News Release",
        "language": "en",
        "publisher": "Reuters Fact Check",
        "is_live_api": True
    }
]

MOCK_FALSE_EVIDENCE = [
    {
        "source_name": "PolitiFact",
        "title": "Viral posts falsely claim the moon will disappear from Earth orbit",
        "date": "2024-05-11",
        "summary": "The moon cannot vanish or disappear from orbit.",
        "url": "https://www.politifact.com/factchecks/2024/moon-disappearing-hoax/",
        "rating": "False",
        "claim": "The Moon will completely disappear next Tuesday",
        "claimant": "Viral social media posts",
        "language": "en",
        "publisher": "PolitiFact",
        "is_live_api": True
    }
]


def test_scenario_1_clearly_true_article():
    """Scenario 1: Verified factual article with corroborated claims -> REAL"""
    factcheck_cache.clear()
    with patch("app.services.factcheck_service.search_google_factcheck", return_value=MOCK_TRUE_EVIDENCE):
        text = (
            "NASA officially launched the Europa Clipper mission on a Falcon Heavy rocket today. "
            "The mission will study Jupiter's icy moon Europa to determine if conditions could support life. "
            "According to NASA scientists, the spacecraft will travel 1.8 billion miles to reach Jupiter."
        )
        res = analyze_text_content(text, title="NASA Launches Europa Clipper")
        
        assert res["verdict"] == "real", f"Expected 'real', got {res['verdict']}"
        assert res["confidence"] >= 75
        assert res["metadata"]["num_supported"] >= 1
        assert res["metadata"]["num_contradicted"] == 0
        
        # Verify explanation separation
        exp = res["explanation_breakdown"]
        assert "final_reasoning" in exp
        assert "factcheck_evidence" in exp
        assert "linguistic_signals" in exp
        assert "corroborated" in exp["factcheck_evidence"].lower() or "supported" in exp["factcheck_evidence"].lower()
        print("[OK] Scenario 1 Passed: Clearly True article verified as REAL with high confidence and separated explanations.")


def test_scenario_2_clearly_false_claim():
    """Scenario 2: Debunked claim with verified contradictions -> FAKE"""
    factcheck_cache.clear()
    with patch("app.services.factcheck_service.search_google_factcheck", return_value=MOCK_FALSE_EVIDENCE):
        text = (
            "BREAKING NEWS: Shocking scientific announcement reveals the Moon will completely disappear next Tuesday! "
            "Scientists confirm the moon will disappear forever from our night sky."
        )
        res = analyze_text_content(text, title="Moon Will Completely Disappear")
        
        assert res["verdict"] == "fake", f"Expected 'fake', got {res['verdict']}"
        assert res["confidence"] >= 75
        assert res["metadata"]["num_contradicted"] >= 1
        
        exp = res["explanation_breakdown"]
        assert "contradicted" in exp["factcheck_evidence"].lower()
        assert "sensationalism" in exp["linguistic_signals"].lower()
        print("[OK] Scenario 2 Passed: Clearly False claim verified as FAKE with live fact-check attribution.")


def test_scenario_3_mixed_misleading_claim():
    """Scenario 3: Content containing both supported and contradicted statements -> UNCERTAIN (MIXED / MISLEADING)"""
    factcheck_cache.clear()
    
    # Custom mock that returns True for NASA launch and False for Moon disappearing
    def mock_factcheck_mixed(query):
        q = query.lower()
        if "europa" in q or "nasa" in q:
            return MOCK_TRUE_EVIDENCE
        if "moon" in q or "disappear" in q:
            return MOCK_FALSE_EVIDENCE
        return None

    with patch("app.services.factcheck_service.search_google_factcheck", side_effect=mock_factcheck_mixed):
        text = (
            "NASA launched the Europa Clipper mission on a Falcon Heavy rocket to Jupiter today. "
            "Shockingly, during the launch scientists discovered the moon will disappear completely next week."
        )
        res = analyze_text_content(text, title="NASA Launch and Moon Announcement")
        
        assert res["verdict"] == "uncertain", f"Expected 'uncertain' for mixed content, got {res['verdict']}"
        assert res["metadata"]["verdict_category"] == "MIXED / MISLEADING"
        assert res["metadata"]["num_supported"] >= 1
        assert res["metadata"]["num_contradicted"] >= 1
        assert 55 <= res["confidence"] <= 78
        print("[OK] Scenario 3 Passed: Mixed/Misleading claim verified as UNCERTAIN (MIXED / MISLEADING).")


def test_scenario_4_claim_with_no_available_fact_check():
    """Scenario 4: Unverified obscure claim with no external registry match -> UNCERTAIN (UNVERIFIED)"""
    factcheck_cache.clear()
    # Mock returning None (no fact check found anywhere)
    with patch("app.services.factcheck_service.search_google_factcheck", return_value=None):
        text = (
            "A neighborhood pottery studio on Elm Street announced it will expand its pottery workshop hours on Thursdays. "
            "The owner stated that four additional ceramic wheels were delivered yesterday."
        )
        res = analyze_text_content(text, title="Local Pottery Studio Expansion")
        
        # Must be UNCERTAIN because no accredited empirical evidence corroborates or refutes it
        assert res["verdict"] == "uncertain", f"Expected 'uncertain' for unverified claims, got {res['verdict']}"
        assert res["metadata"]["verdict_category"] == "UNCERTAIN"
        assert res["metadata"]["num_supported"] == 0
        assert res["metadata"]["num_contradicted"] == 0
        assert res["confidence"] <= 60
        
        exp = res["explanation_breakdown"]
        assert "unverified" in exp["factcheck_evidence"].lower() or "insufficient" in exp["final_reasoning"].lower()
        print("[OK] Scenario 4 Passed: Unverified claim without fact check correctly rated UNCERTAIN (never falsely assuming real).")


def test_scenario_5_url_input():
    """Scenario 5: URL input analysis with mock HTML extraction"""
    import asyncio
    async def _test():
        sample_html = """
        <html>
          <head><title>Spacecraft Mission Reaches Milestone</title></head>
          <body>
            <article>
              <h1>NASA launched the Europa Clipper spacecraft</h1>
              <p>The mission will investigate the habitability of Jupiter's moon Europa with high precision instruments.</p>
            </article>
          </body>
        </html>
        """
        with patch("httpx.AsyncClient.get") as mock_http:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.text = sample_html
            mock_http.return_value = mock_resp

            title, content = await extract_article_from_url("https://example.com/nasa-europa-mission")
            assert "Europa Clipper" in title or "Europa Clipper" in content

            with patch("app.services.factcheck_service.search_google_factcheck", return_value=MOCK_TRUE_EVIDENCE):
                res = analyze_text_content(content, title=title)
                assert res["verdict"] in ["real", "uncertain"]
                assert len(res["detailed_claims"]) >= 1
        print("[OK] Scenario 5 Passed: URL input successfully scraped and evaluated through the pipeline.")
    asyncio.run(_test())


def test_scenario_6_text_input():
    """Scenario 6: Standard text input flow with full claim extraction and metrics breakdown"""
    text = (
        "Officials from the National Weather Service issued an official flash flood advisory for southern counties. "
        "Residents are advised to monitor local radio broadcasts and avoid low-lying roads."
    )
    res = analyze_text_content(text, title="Weather Advisory Issued")
    assert res["verdict"] in ["real", "uncertain"]
    assert len(res["metrics"]) == 5
    assert len(res["detailed_claims"]) >= 1
    assert "explanation_breakdown" in res
    print("[OK] Scenario 6 Passed: Standard Text input correctly extracted and verified with full metric breakdown.")


if __name__ == "__main__":
    import asyncio
    print("==================================================")
    print("RUNNING END-TO-END SCENARIOS TEST SUITE")
    print("==================================================")
    test_scenario_1_clearly_true_article()
    test_scenario_2_clearly_false_claim()
    test_scenario_3_mixed_misleading_claim()
    test_scenario_4_claim_with_no_available_fact_check()
    asyncio.run(test_scenario_5_url_input())
    test_scenario_6_text_input()
    print("\n==================================================")
    print("ALL 6 END-TO-END SCENARIO TESTS PASSED!")
    print("==================================================")
