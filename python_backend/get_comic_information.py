import contextlib

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from chrome_options import get_chrome_options


def get_information(url: str) -> dict[str, str]:
    driver = None
    try:
        print(f"Starting selenium for URL: {url}")
        driver = webdriver.Chrome(options=get_chrome_options())
        driver.get(url)

        try:
            WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Nur technische Cookies verwenden')]"))
            ).click()
            print("Clicked on cookie consent button")
        except Exception:
            pass

        try:
            priceField = WebDriverWait(driver, 20).until(
                EC.visibility_of_element_located((By.XPATH, "//span[@class='price']"))
            )
        except Exception:
            try:
                priceField = WebDriverWait(driver, 5).until(
                    EC.visibility_of_element_located((By.XPATH, "//*[contains(@class, 'price')]"))
                )
            except Exception:
                class DummyElement:
                    text = "Price unavailable"
                priceField = DummyElement()

        try:
            informationTable = WebDriverWait(driver, 20).until(
                EC.visibility_of_element_located((By.XPATH, "//div[@class='additional-attributes-wrapper']"))
            )
        except Exception:
            try:
                informationTable = WebDriverWait(driver, 5).until(
                    EC.visibility_of_element_located((By.XPATH, "//*[contains(@class, 'product-info-main')]"))
                )
            except Exception:
                class DummyElement:
                    def find_elements(self, *args: object, **kwargs: object) -> list[object]:
                        return []
                informationTable = DummyElement()

        data: dict[str, str] = {
            "price": priceField.text.strip(),
            "url": url
        }

        for selector in [
            "//h1[@class='page-title']/span",
        ]:
            try:
                titleElement = driver.find_element(By.XPATH, selector)
                data["title"] = titleElement.text.strip()
                data["name"] = titleElement.text.strip()
                print(f"Found title/name: {data['title']}")
                break
            except Exception:
                continue
        else:
            for css_selector in ["span.base[data-ui-id='page-title-wrapper']", "h1.product-name", ".product-name, .product-title, .item-title"]:
                try:
                    titleElement = driver.find_element(By.CSS_SELECTOR, css_selector)
                    data["title"] = titleElement.text.strip()
                    data["name"] = titleElement.text.strip()
                    print(f"Found title with {css_selector}: {data['title']}")
                    break
                except Exception:
                    continue
            else:
                data["title"] = "Unknown Title"
                data["name"] = "Unknown Comic"

        list_items = informationTable.find_elements(By.XPATH, ".//ul[@class='items']/li")
        print(f"Found {len(list_items)} information items")

        for item in list_items:
            try:
                label = item.find_element(By.XPATH, ".//strong[@class='label']").text.strip(':')
                value = item.find_element(By.XPATH, ".//span[@class='data']").text.strip()
                data[label] = value
            except Exception:
                pass

        if data["price"] == "":
            data["price"] = "Price unavailable"

        print(f"Successfully extracted data for {url}")
        return data

    except Exception as e:
        print(f"Error in get_information: {e}")
        return {
            "price": "Price unavailable",
            "url": url,
            "title": "Unknown Title",
            "name": "Unknown Comic"
        }
    finally:
        if driver:
            with contextlib.suppress(Exception):
                driver.quit()
