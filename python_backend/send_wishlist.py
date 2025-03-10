from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import os
from time import sleep
from dotenv import load_dotenv

load_dotenv()

destination_email = os.getenv("EMAIL_USER")

options = Options()
options.add_argument("--disable-blink-features=AutomationControlled")
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
options.add_argument("--headless")

def bypass_recaptcha(driver):
    try:
        # Wait for the iframe that contains the reCAPTCHA to be present
        iframe = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, 'iframe'))
        )
        driver.switch_to.frame(iframe)

        # Try to click the CAPTCHA checkbox
        captcha_checkbox = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.ID, 'recaptcha-anchor'))
        )
        captcha_checkbox.click()

        driver.switch_to.default_content()
        print("Captcha solved")
    except Exception as e:
        print("No CAPTCHA found or failed to solve:", e)

def send_wishlist(email, password):
    driver = webdriver.Chrome(options=options)
    driver.get("https://www.panini.de/shp_deu_de/customer/account/login/")

    WebDriverWait(driver, 5).until(
        EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Nur technische Cookies verwenden')]"))
    ).click()

    email_field = WebDriverWait(driver, 15).until(
        EC.visibility_of_element_located((By.XPATH, "//input[@placeholder='Email *']"))
    )
    password_field = WebDriverWait(driver, 15).until(
        EC.visibility_of_element_located((By.XPATH, "//input[@placeholder='Passwort *']"))
    )

    driver.execute_script("arguments[0].scrollIntoView(true);", email_field)
    driver.execute_script("arguments[0].scrollIntoView(true);", password_field)

    driver.execute_script("arguments[0].value = arguments[1];", email_field, email)
    driver.execute_script("arguments[0].value = arguments[1];", password_field, password)

    login_button = WebDriverWait(driver, 5).until(
        EC.element_to_be_clickable((By.XPATH, "//input[@value='Senden']"))
    )
    driver.execute_script("arguments[0].scrollIntoView(true);", login_button)
    driver.execute_script("arguments[0].click();", login_button)

    WebDriverWait(driver, 5).until(
        EC.presence_of_element_located((By.XPATH, "//span[contains(text(),'Mein Konto')]"))
    )

    # Check if CAPTCHA is present by looking for reCAPTCHA elements
    if driver.find_elements(By.ID, 'recaptcha-anchor'):
        print("Captcha detected")
        bypass_recaptcha(driver)
    else:
        print("No CAPTCHA detected")

    if not "Welcome" in driver.page_source:
        driver.quit()
        return "Login failed"

    driver.get("https://www.panini.de/shp_deu_de/wishlist/index/share/wishlist_id/2222286/")

    emails_input = WebDriverWait(driver, 5).until(
        EC.element_to_be_clickable((By.XPATH, "//textarea[@name='emails']"))
    )
    print("Destination: ", destination_email)
    driver.execute_script("arguments[0].value = arguments[1];", emails_input, destination_email)

    message_input = WebDriverWait(driver, 5).until(
        EC.element_to_be_clickable((By.XPATH, "//textarea[@name='message']"))
    )
    driver.execute_script("arguments[0].value = arguments[1];", message_input, 'WISHLIST FROM ' + email)

    share_button = WebDriverWait(driver, 5).until(
        EC.element_to_be_clickable((By.XPATH, "//button[@title='Wunschliste teilen']"))
    )
    driver.execute_script("arguments[0].scrollIntoView(true);", share_button)
    driver.execute_script("arguments[0].click();", share_button)

    sleep(20)

    driver.quit()
    return "Wishlist send successfully."
