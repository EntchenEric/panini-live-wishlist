import os
import traceback

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from chrome_options import get_chrome_options

LOGIN_URL = "https://www.panini.de/shp_deu_de/customer/account/login/"

DEBUG_DIR = os.environ.get("SELENIUM_DEBUG_DIR", "")


def _save_debug_info(driver, label: str) -> None:
    """Save screenshot and page source for debugging (only if SELENIUM_DEBUG_DIR is set)."""
    if not DEBUG_DIR:
        return


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

        # Wait for Gigya SDK to render the login form
        print("Waiting for Gigya login form...")
        username_fields = WebDriverWait(driver, 20).until(
            lambda d: [el for el in d.find_elements(By.CSS_SELECTOR, "input.gigya-input-text[name='username']") if el.is_displayed()]
        )
        email_field = username_fields[0]

        password_fields = WebDriverWait(driver, 10).until(
            lambda d: [el for el in d.find_elements(By.CSS_SELECTOR, "input.gigya-input-password[name='password']") if el.is_displayed()]
        )
        password_field = password_fields[0]

        print("Filling login form...")
        driver.execute_script("arguments[0].value = arguments[1];", email_field, email)
        driver.execute_script("arguments[0].value = arguments[1];", password_field, password)

        print("Clicking login button...")
        login_buttons = driver.find_elements(By.CSS_SELECTOR, "input.gigya-input-submit[type='submit']")
        visible_buttons = [b for b in login_buttons if b.is_displayed()]
        if not visible_buttons:
            _save_debug_info(driver, "no_visible_submit")
            raise Exception("No visible submit button found")
        login_button = visible_buttons[0]
        driver.execute_script("arguments[0].click();", login_button)

        print("Waiting for login to complete...")
        try:
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.XPATH, "//*[contains(text(),'Mein Konto')]"))
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