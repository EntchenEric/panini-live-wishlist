from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

options = Options()
options.add_argument("--disable-blink-features=AutomationControlled")
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
options.add_argument("--headless")

def get_information(url: str):
    try:
        driver = webdriver.Chrome(options=options)
        driver.get(url)

        WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Nur technische Cookies verwenden')]"))
        ).click()

        priceField = WebDriverWait(driver, 15).until(
            EC.visibility_of_element_located((By.XPATH, "//span[@class='price']"))
        )

        informationTable = WebDriverWait(driver, 15).until(
            EC.visibility_of_element_located((By.XPATH, "//div[@class='additional-attributes-wrapper']"))
        )

        data = {
            "price": priceField.text,
        }

        list_items = informationTable.find_elements(By.XPATH, ".//ul[@class='items']/li")
        for item in list_items:
            label = item.find_element(By.XPATH, ".//strong[@class='label']").text.strip(':')
            value = item.find_element(By.XPATH, ".//span[@class='data']").text.strip()

            data[label] = value

        driver.quit()
        return data

    except Exception as e:
        driver.quit()
        return f"Information fetching failed: {e}"
