from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from time import sleep
import traceback

from chrome_options import get_chrome_options


def get_wishlist(email: str, password: str | None = None) -> dict[str, str | list[dict[str, str]]]:
    driver = None
    try:
        print(f"Starting Chrome WebDriver for {email[:3]}...")
        driver = webdriver.Chrome(options=get_chrome_options())
        driver.set_page_load_timeout(30)

        if password:
            print("Logging in to access user's wishlist...")
            driver.get("https://www.panini.de/shp_deu_de/customer/account/login/")

            try:
                print("Looking for cookie consent button...")
                WebDriverWait(driver, 10).until(
                    EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Nur technische Cookies verwenden')]"))
                ).click()
            except Exception:
                pass

            print("Filling login form...")
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
            except Exception as e:
                print(f"Login failed: {e}")
                raise Exception("Login failed - could not access user's wishlist")

            print("Navigating to wishlist page...")
            driver.get("https://www.panini.de/shp_deu_de/wishlist/shared/")
            sleep(3)
        else:
            print("No password provided, accessing shared wishlist page...")
            driver.get("https://www.panini.de/shp_deu_de/wishlist/shared/")

            try:
                WebDriverWait(driver, 10).until(
                    EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Nur technische Cookies verwenden')]"))
                ).click()
            except Exception:
                pass

            sleep(3)

        print("Waiting for product items to load...")
        try:
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "ol.product-items"))
            )
            print("Product items loaded successfully")
        except Exception:
            print(f"Error waiting for product items")

            if password:
                message_elements = BeautifulSoup(driver.page_source, "lxml").select(".message")
                for msg in message_elements:
                    text = msg.get_text(strip=True)
                    if "leer" in text.lower() or "empty" in text.lower():
                        print("Empty wishlist detected")
                        return {"message": f"Wishlist for {email} is empty", "data": []}

            return {"message": f"No wishlist items found for {email}", "data": []}

        print("Getting page content...")
        html_content = driver.page_source
        soup = BeautifulSoup(html_content, "lxml")

        product_items = soup.select("li.product-item")

        if not product_items:
            product_items = soup.select(".product-item")

        if not product_items:
            product_items = soup.select(".product-items li")

        if not product_items:
            empty_wishlist = soup.select_one(".message.info.empty")
            if empty_wishlist:
                return {"message": f"Wishlist for {email} is empty", "data": []}
            return {"message": "No wishlist items found", "data": []}

        print(f"Found {len(product_items)} product items")
        datas: list[dict[str, str]] = []
        for idx, item in enumerate(product_items):
            try:
                product_link_elem = item.select_one("a.product-item-link")
                if not product_link_elem:
                    product_link_elem = item.select_one("a.product-item-name")
                if not product_link_elem:
                    product_link_elem = item.select_one("a[href]")

                name = product_link_elem.get_text(strip=True) if product_link_elem else "Unknown Product"
                link = product_link_elem.get("href", "") if product_link_elem else ""

                img_tag = item.select_one("img.product-image-photo")
                if not img_tag:
                    img_tag = item.select_one("img")

                img_url = img_tag.get("src", "") if img_tag else ""

                if "/cache/" in img_url:
                    new_url = img_url.split("/cache/")[1]
                    img_url = img_url.split("/cache/")[0] + "/" + "/".join(new_url.split("/")[1:])

                price_elem = item.select_one("span.price")
                price = price_elem.get_text(strip=True) if price_elem else "Price not available"

                release_date_elem = item.select_one("div.product-item-attribute-release-date small")
                if not release_date_elem:
                    release_date_elem = item.select_one(".release-date")
                if not release_date_elem:
                    release_date_elem = item.select_one("[data-role='release-date']")

                release_date = release_date_elem.get_text(strip=True) if release_date_elem else "Date not available"

                print(f"Found product: {name}")
                datas.append({
                    "name": name,
                    "link": link,
                    "image": img_url,
                    "price": price,
                    "release_date": release_date
                })
            except Exception as e:
                print(f"Error parsing product item: {e}")
                traceback.print_exc()
                continue

        message = f"Wishlist for {email}"
        print(f"Successfully processed wishlist with {len(datas)} items")
        return {"message": message, "data": datas}

    except Exception as e:
        print(f"Error getting wishlist: {e}")
        traceback.print_exc()
        return {"message": f"Failed to get wishlist: {str(e)}", "data": []}

    finally:
        if driver:
            print("Closing WebDriver...")
            driver.quit()