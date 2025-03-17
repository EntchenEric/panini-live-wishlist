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
    driver = None
    try:
        print(f"Starting selenium for URL: {url}")
        driver = webdriver.Chrome(options=options)
        driver.get(url)
        
        try:
            WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Nur technische Cookies verwenden')]"))
            ).click()
            print("Clicked on cookie consent button")
        except Exception as e:
            print(f"Cookie button not found or not clickable: {e}")
        try:
            priceField = WebDriverWait(driver, 20).until(
                EC.visibility_of_element_located((By.XPATH, "//span[@class='price']"))
            )
            print("Found price element")
        except Exception as e:
            print(f"Price element not found: {e}")
            try:
                priceField = WebDriverWait(driver, 5).until(
                    EC.visibility_of_element_located((By.XPATH, "//*[contains(@class, 'price')]"))
                )
                print("Found price element using alternative selector")
            except:
                print("No price element found with any selector")
                class DummyElement:
                    text = "Price unavailable"
                priceField = DummyElement()

        try:
            informationTable = WebDriverWait(driver, 20).until(
                EC.visibility_of_element_located((By.XPATH, "//div[@class='additional-attributes-wrapper']"))
            )
            print("Found information table")
        except Exception as e:
            print(f"Information table not found: {e}")
            try:
                informationTable = WebDriverWait(driver, 5).until(
                    EC.visibility_of_element_located((By.XPATH, "//*[contains(@class, 'product-info-main')]"))
                )
                print("Found information using alternative selector")
            except:
                print("No information table found with any selector")
                class DummyElement:
                    def find_elements(self, *args, **kwargs):
                        return []
                informationTable = DummyElement()

        data = {
            "price": priceField.text.strip(),
            "url": url
        }

        try:
            titleElement = driver.find_element(By.XPATH, "//h1[@class='page-title']/span")
            data["title"] = titleElement.text.strip()
            data["name"] = titleElement.text.strip()
            print(f"Found title/name: {data['title']}")
        except Exception as e:
            print(f"Title not found with primary selector: {e}")
            try:
                titleElement = driver.find_element(By.CSS_SELECTOR, "span.base[data-ui-id='page-title-wrapper']")
                data["title"] = titleElement.text.strip()
                data["name"] = titleElement.text.strip()
                print(f"Found title with span.base selector: {data['title']}")
            except Exception as e:
                print(f"Title not found with span.base selector: {e}")
                try:
                    titleElement = driver.find_element(By.CSS_SELECTOR, "h1.product-name")
                    data["title"] = titleElement.text.strip()
                    data["name"] = titleElement.text.strip()
                    print(f"Found title with product-name selector: {data['title']}")
                except Exception as e:
                    print(f"Title not found with product-name selector: {e}")
                    try:
                        titleElement = driver.find_element(By.CSS_SELECTOR, ".product-name, .product-title, .item-title")
                        data["title"] = titleElement.text.strip() 
                        data["name"] = titleElement.text.strip()
                        print(f"Found title with generic selector: {data['title']}")
                    except Exception as e:
                        print(f"No title element found with any selector: {e}")
                        data["title"] = "Unknown Title"
                        data["name"] = "Unknown Comic"

        list_items = informationTable.find_elements(By.XPATH, ".//ul[@class='items']/li")
        print(f"Found {len(list_items)} information items")
        
        for item in list_items:
            try:
                label = item.find_element(By.XPATH, ".//strong[@class='label']").text.strip(':')
                value = item.find_element(By.XPATH, ".//span[@class='data']").text.strip()
                data[label] = value
                print(f"Extracted {label}: {value}")
            except Exception as e:
                print(f"Error extracting item information: {e}")

        if data["price"] == "":
            data["price"] = "Price unavailable"

        if driver:
            driver.quit()
            driver = None
            
        print(f"Successfully extracted data for {url}")
        return data

    except Exception as e:
        print(f"Error in get_information: {e}")
        if driver:
            try:
                driver.quit()
            except:
                pass
            
        return {
            "price": "Price unavailable",
            "error": str(e),
            "url": url,
            "title": "Unknown Title",
            "name": "Unknown Comic"
        }
