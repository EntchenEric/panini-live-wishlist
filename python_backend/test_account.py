from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import traceback

options = Options()
options.add_argument("--disable-blink-features=AutomationControlled")
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
options.add_argument("--headless")
options.add_argument("--disable-gpu")
options.add_argument("--window-size=1920,1080")
options.add_argument("--start-maximized")
options.add_argument("--disable-extensions")
options.add_argument("--disable-infobars")
options.add_argument("--disable-notifications")
options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36")

def handle_login(email, password):
    driver = None
    try:
        print(f"Starting Chrome WebDriver for login test for {email}...")
        driver = webdriver.Chrome(options=options)
        driver.set_page_load_timeout(30)
        
        print("Navigating to login page...")
        driver.get("https://www.panini.de/shp_deu_de/customer/account/login/")

        try:
            print("Looking for cookie consent button...")
            WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Nur technische Cookies verwenden')]"))
            ).click()
            print("Clicked cookie consent button")
        except Exception as e:
            print(f"Cookie consent button not found: {e}")
            # Cookie dialog might not appear, that's okay
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

        print("Ensuring fields are clickable...")
        WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//input[@placeholder='Email *']"))
        )
        WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//input[@placeholder='Passwort *']"))
        )

        print("Filling login form...")
        driver.execute_script("arguments[0].value = arguments[1];", email_field, email)
        driver.execute_script("arguments[0].value = arguments[1];", password_field, password)

        print("Finding login button...")
        login_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//input[@value='Senden']"))
        )
        print("Clicking login button...")
        driver.execute_script("arguments[0].scrollIntoView(true);", login_button)
        driver.execute_script("arguments[0].click();", login_button)

        print("Waiting for login to complete...")
        try:
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.XPATH, "//span[contains(text(),'Mein Konto')]"))
            )
            print("Found 'Mein Konto' element - login successful")
            
            if "Welcome" in driver.page_source or "Willkommen" in driver.page_source:
                print("Found welcome message")
                if driver:
                    driver.quit()
                return "Login successful"
            else:
                print("Logged in but didn't find welcome message")
                if driver:
                    driver.quit()
                return "Login successful"
        except Exception as e:
            print(f"Login verification failed: {e}")
            try:
                with open("login_test_error.html", "w") as f:
                    f.write(driver.page_source)
                print("Saved login test page source for debugging")
            except:
                print("Could not save login test page source")
                
            if driver:
                driver.quit()
            return "Login failed"

    except Exception as e:
        print(f"Error in handle_login: {e}")
        traceback.print_exc()
        if driver:
            try:
                with open("login_error.html", "w") as f:
                    f.write(driver.page_source)
                print("Saved login error page for debugging")
            except:
                print("Could not save login error page")
        if driver:
            driver.quit()
        return "Login failed"
