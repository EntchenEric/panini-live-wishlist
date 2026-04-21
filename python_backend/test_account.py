import os
import traceback

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from chrome_options import get_chrome_options

LOGIN_URL = "https://www.panini.de/shp_deu_de/customer/account/login/"

DEBUG_DIR = os.environ.get("SELENIUM_DEBUG_DIR", "/tmp/selenium_debug")


def _save_debug_info(driver, label: str) -> None:
    """Save screenshot and page source for debugging."""
    os.makedirs(DEBUG_DIR, exist_ok=True)
    try:
        path = os.path.join(DEBUG_DIR, f"{label}_screenshot.png")
        driver.save_screenshot(path)
        print(f"Debug screenshot saved to {path}")
    except Exception:
        pass
    try:
        path = os.path.join(DEBUG_DIR, f"{label}_source.html")
        with open(path, "w", encoding="utf-8") as f:
            f.write(driver.page_source)
        print(f"Debug page source saved to {path}")
    except Exception:
        pass
    print(f"Current URL: {driver.current_url}")
    print(f"Page title: {driver.title}")


def handle_login(email: str, password: str) -> str:
    driver = None
    try:
        print(f"Starting Chrome WebDriver for login test for {email[:3]}...")
        driver = webdriver.Chrome(options=get_chrome_options())
        driver.set_page_load_timeout(30)

        print("Navigating to login page...")
        driver.get(LOGIN_URL)

        # Check if redirected to queue-it waiting room
        if "queue-it.net" in driver.current_url:
            print("Redirected to queue-it waiting room, waiting for redirect back...")
            WebDriverWait(driver, 120).until(
                lambda d: "queue-it.net" not in d.current_url
            )
            print("Left queue-it, continuing login flow")

        try:
            print("Looking for cookie consent button...")
            consent_btn = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Nur technische Cookies verwenden')]"))
            )
            consent_btn.click()
            print("Clicked cookie consent button")
        except Exception:
            print("No cookie consent button found, continuing")

        print(f"Current URL after cookie: {driver.current_url}")

        print("Waiting for login form fields...")
        try:
            email_field = WebDriverWait(driver, 15).until(
                EC.visibility_of_element_located((By.CSS_SELECTOR, "input[type='email'], input[name='login[username]'], input#email"))
            )
        except Exception:
            _save_debug_info(driver, "email_field_not_found")
            raise

        password_field = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, "input[type='password'], input[name='login[password]'], input#pass"))
        )

        print("Filling login form...")
        email_field.clear()
        email_field.send_keys(email)
        password_field.clear()
        password_field.send_keys(password)

        print("Clicking login button...")
        login_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "button[type='submit'].action.login, input[type='submit'][value='Senden'], button.action.login"))
        )
        driver.execute_script("arguments[0].scrollIntoView(true);", login_button)
        driver.execute_script("arguments[0].click();", login_button)

        print("Waiting for login to complete...")
        try:
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.XPATH, "//span[contains(text(),'Mein Konto')]"))
            )
            print("Login successful")
            return "Login successful"
        except Exception:
            _save_debug_info(driver, "login_verification_failed")
            print("Login verification failed")
            return "Login failed"

    except Exception as e:
        print(f"Error in handle_login: {e}")
        traceback.print_exc()
        if driver:
            _save_debug_info(driver, "login_error")
        return "Login failed"
    finally:
        if driver:
            driver.quit()