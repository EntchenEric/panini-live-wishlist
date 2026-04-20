import os
from time import sleep

from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from chrome_options import get_chrome_options

load_dotenv()

destination_email = os.getenv("EMAIL_USER")


def bypass_recaptcha(driver: webdriver.Chrome) -> None:
    # WARNING: Automated CAPTCHA bypass is fragile and may violate terms of service.
    # This should be replaced with a proper solution (e.g., manual CAPTCHA solving
    # service, or server-side wishlist sharing that avoids CAPTCHA entirely).
    try:
        iframe = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, 'iframe'))
        )
        driver.switch_to.frame(iframe)

        captcha_checkbox = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.ID, 'recaptcha-anchor'))
        )
        captcha_checkbox.click()

        driver.switch_to.default_content()
        print("Captcha solved")
    except Exception as e:
        print(f"No CAPTCHA found or failed to solve: {e}")


def send_wishlist(email: str, password: str) -> str:
    driver = webdriver.Chrome(options=get_chrome_options())
    try:
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

        if driver.find_elements(By.ID, 'recaptcha-anchor'):
            print("Captcha detected")
            bypass_recaptcha(driver)
        else:
            print("No CAPTCHA detected")

        if "Welcome" not in driver.page_source:
            return "Login failed"

        driver.get("https://www.panini.de/shp_deu_de/wishlist/index/share/wishlist_id/2222286/")

        emails_input = WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.XPATH, "//textarea[@name='emails']"))
        )
        print(f"Destination: {destination_email}")
        driver.execute_script("arguments[0].value = arguments[1];", emails_input, destination_email)

        message_input = WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.XPATH, "//textarea[@name='message']"))
        )
        driver.execute_script("arguments[0].value = arguments[1];", message_input, f'WISHLIST FROM {email}')

        share_button = WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.XPATH, "//button[@title='Wunschliste teilen']"))
        )
        driver.execute_script("arguments[0].scrollIntoView(true);", share_button)
        driver.execute_script("arguments[0].click();", share_button)

        sleep(20)

        return "Wishlist send successfully."
    finally:
        driver.quit()
