import asyncio
import aiohttp
import json

async def test_login_api():
    """Test the login API endpoint directly"""
    print("=== TESTING LOGIN API ENDPOINT ===")
    
    # Test data
    login_data = {
        "email": "admin@example.com",
        "password": "admin123"
    }
    
    url = "http://localhost:8000/api/v1/auth/login"
    
    try:
        async with aiohttp.ClientSession() as session:
            print(f"\n1. Testing POST {url}")
            print(f"   Payload: {json.dumps(login_data, indent=2)}")
            
            async with session.post(
                url,
                json=login_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                print(f"\n2. Response Status: {response.status}")
                print(f"   Response Headers: {dict(response.headers)}")
                
                if response.status == 200:
                    data = await response.json()
                    print(f"\n3. ✓ LOGIN SUCCESSFUL!")
                    print(f"   Access Token: {data.get('access_token', 'N/A')[:50]}...")
                    print(f"   User ID: {data.get('user', {}).get('_id', 'N/A')}")
                    print(f"   User Email: {data.get('user', {}).get('email', 'N/A')}")
                    print(f"   User Role: {data.get('user', {}).get('role', 'N/A')}")
                    print(f"   User Permissions: {data.get('user', {}).get('permissions', [])}")
                    return True
                else:
                    error_data = await response.text()
                    print(f"\n3. ✗ LOGIN FAILED!")
                    print(f"   Error: {error_data}")
                    return False
                    
    except Exception as e:
        print(f"\n3. ✗ REQUEST FAILED!")
        print(f"   Exception: {e}")
        return False

async def test_wrong_credentials():
    """Test with wrong credentials"""
    print("\n\n=== TESTING WRONG CREDENTIALS ===")
    
    # Test data with wrong password
    login_data = {
        "email": "admin@example.com",
        "password": "wrongpassword"
    }
    
    url = "http://localhost:8000/api/v1/auth/login"
    
    try:
        async with aiohttp.ClientSession() as session:
            print(f"\n1. Testing POST {url} with wrong password")
            
            async with session.post(
                url,
                json=login_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                print(f"\n2. Response Status: {response.status}")
                
                if response.status == 401:
                    error_data = await response.json()
                    print(f"\n3. ✓ CORRECTLY REJECTED WRONG CREDENTIALS")
                    print(f"   Error Message: {error_data.get('detail', 'N/A')}")
                    return True
                else:
                    print(f"\n3. ✗ UNEXPECTED RESPONSE")
                    data = await response.text()
                    print(f"   Response: {data}")
                    return False
                    
    except Exception as e:
        print(f"\n3. ✗ REQUEST FAILED!")
        print(f"   Exception: {e}")
        return False

async def main():
    print("Starting API login tests...\n")
    
    # Test correct credentials
    success1 = await test_login_api()
    
    # Test wrong credentials
    success2 = await test_wrong_credentials()
    
    print("\n\n=== TEST SUMMARY ===")
    print(f"✓ Correct credentials test: {'PASSED' if success1 else 'FAILED'}")
    print(f"✓ Wrong credentials test: {'PASSED' if success2 else 'FAILED'}")
    
    if success1 and success2:
        print("\n🎉 ALL TESTS PASSED! Login API is working correctly.")
    else:
        print("\n❌ SOME TESTS FAILED! Check the issues above.")

if __name__ == "__main__":
    asyncio.run(main())