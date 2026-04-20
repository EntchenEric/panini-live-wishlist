import traceback

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from chrome_options import get_chrome_options


def handle_login(email: str, password: str) -> str:
    driver = None
    try:
        print(f"Starting Chrome WebDriver for login test for {email[:3]}...")
        driver = webdriver.Chrome(options=get_chrome_options())
        driver.set_page_load_timeout(30)

        print("Navigating to login page...")
        driver.get("https://www.panini.de/shp_deu_de/customer/account/login/")

        try:
            print("Looking for cookie consent button...")
            WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Nur technische Cookies verwenden')]"))
            ).click()
            print("Clicked cookie consent button")
        except Exception:
            pass

        print("Waiting for login form fields...")
        email_field = WebDriverWait(driver, 15).until(
            EC.visibility_of_element_located((By.XPATH, "//input[@placeholder='Email *']"))
        )
        password_field = WebDriverWait(driver, 15).until(
            EC.visibility_of_element_located((By.XPATH, "//input[@placeholder='Passwort *']"))
        )

        print("Scrolling to form fields...")
        driver.execute_script("arguments[0].scrollIntoView(true);", email_field)
        driver.execute_script("arguments[0].scrollIntoView(true);", password_field)

        print("Filling login form...")
        driver.execute_script("arguments[0].value = arguments[1];", email_field, email)
        driver.execute_script("arguments[0].value = arguments[1];", password_field, password)

        print("Clicking login button...")
        login_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//input[@value='Senden']"))
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
            print("Login verification failed")
            return "Login failed"

    except Exception as e:
        print(f"Error in handle_login: {e}")
        traceback.print_exc()
        return "Login failed"
    finally:
        if driver:
            driver.quit()
