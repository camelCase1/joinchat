# Testing authentication flow with Playwright
from playwright.sync_api import sync_playwright
import time

def test_auth():
    with sync_playwright() as p:
        # Launch browser in non-headless mode to see what's happening
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        
        # Enable console logging
        page.on("console", lambda msg: print(f"Console {msg.type}: {msg.text}"))
        page.on("pageerror", lambda error: print(f"Page error: {error}"))
        
        try:
            # Navigate to the app
            print("Navigating to http://localhost:3000/auth")
            page.goto("http://localhost:3000/auth", wait_until="networkidle")
            time.sleep(2)
            
            # Test signup flow
            print("\n=== Testing Signup Flow ===")
            
            # Check if we're on the login form initially
            if page.locator("text='Sign up'").is_visible():
                print("Clicking 'Sign up' to switch to signup form")
                page.click("text='Sign up'")
                time.sleep(1)
            
            # Fill signup form
            print("Filling signup form")
            test_email = f"testuser{int(time.time())}@example.com"
            print(f"Using email: {test_email}")
            
            page.fill("input[id='displayName']", "Test User")
            page.fill("input[id='email']", test_email)
            page.fill("input[id='password']", "testpass123")
            page.fill("input[id='confirmPassword']", "testpass123")
            
            # Take screenshot before submission
            page.screenshot(path="signup_before.png")
            
            # Submit form
            print("Submitting signup form")
            page.click("button:has-text('Sign up')")
            
            # Wait for response
            time.sleep(3)
            
            # Check for errors or success
            if page.url == "http://localhost:3000/":
                print("✅ Signup successful - redirected to home")
                page.screenshot(path="signup_success.png")
                
                # Now test logout and login
                print("\n=== Testing Login Flow ===")
                
                # Logout first (if there's a logout button)
                if page.locator("text='Logout'").is_visible():
                    page.click("text='Logout'")
                    time.sleep(2)
                
                # Navigate back to auth
                page.goto("http://localhost:3000/auth")
                time.sleep(2)
                
                # Fill login form
                print(f"Logging in with {test_email}")
                page.fill("input[id='email']", test_email)
                page.fill("input[id='password']", "testpass123")
                
                # Submit login
                page.click("button:has-text('Sign in')")
                time.sleep(3)
                
                if page.url == "http://localhost:3000/":
                    print("✅ Login successful - redirected to home")
                else:
                    print(f"❌ Login failed - still on {page.url}")
                    
            else:
                print(f"❌ Signup failed - still on {page.url}")
                # Check for error messages
                error_elements = page.locator("[role='alert'], .text-red-500, .text-destructive").all()
                for error in error_elements:
                    if error.is_visible():
                        print(f"Error found: {error.text_content()}")
                
                # Take screenshot of error state
                page.screenshot(path="signup_error.png")
                
                # Check console for errors
                print("\nChecking for JavaScript errors...")
            
        except Exception as e:
            print(f"Error during test: {e}")
            page.screenshot(path="error_state.png")
        finally:
            input("\nPress Enter to close browser...")
            browser.close()

if __name__ == "__main__":
    test_auth()