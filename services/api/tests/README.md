# FightSight API Test Scripts

Manual test scripts for validating LLM service integrations and API functionality.

## Test Files

### LLM Service Tests

- **test-anthropic.js** - Test Anthropic SDK installation and basic functionality
- **test-claude-auth.js** - Validate Claude API authentication and model availability
- **test-gemini.js** - Test Gemini API key and list available models
- **test-single-frame.js** - Test Claude vision API with a single video frame

### Test Data

- **test-frame.jpg** - Sample video frame extracted from bradleyswanepoel sparring video (middle frame at 7.5s)

## Running Tests

These scripts are designed to run inside the Docker container:

```bash
# Test Anthropic SDK
docker exec fightsight-api node tests/test-anthropic.js

# Test Claude authentication and models
docker exec fightsight-api node tests/test-claude-auth.js

# Test Gemini API
docker exec fightsight-api node tests/test-gemini.js

# Test single frame analysis with Claude
docker exec fightsight-api node tests/test-single-frame.js
```

## Environment Variables Required

- `ANTHROPIC_API_KEY` - For Claude tests
- `GEMINI_API_KEY` - For Gemini tests

## Notes

- These are manual test scripts for development and debugging
- Not part of the automated test suite
- Used to validate API integrations during development
- The single frame test expects the test-frame.jpg to be available in the container at `/app/test-frame.jpg`
