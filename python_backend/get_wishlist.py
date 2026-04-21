import contextlib
import traceback
from time import sleep

from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from chrome_options import get_chrome_options


def _click_cookie_consent(driver: webdriver.Chrome) -> None:
    try:
        WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Nur technische Cookies verwenden')]"))
        ).click()
        print("Clicked cookie consent button")
    except Exception:
        pass


def _gigya_login(driver: webdriver.Chrome, email: str, password: str) -> None:
    """Login using Gigya SDK on Panini's site."""
    # Check for queue-it redirect
    if "queue-it.net" in driver.current_url:
        print("Redirected to queue-it, waiting...")
        WebDriverWait(driver, 120).until(
            lambda d: "queue-it.net" not in d.current_url
        )

    _click_cookie_consent(driver)

    print("Filling Gigya login form...")
    username_fields = WebDriverWait(driver, 20).until(
        lambda d: [el for el in d.find_elements(By.CSS_SELECTOR, "input.gigya-input-text[name='username']") if el.is_displayed()]
    )
    username_fields[0].send_keys(email)

    password_fields = WebDriverWait(driver, 10).until(
        lambda d: [el for el in d.find_elements(By.CSS_SELECTOR, "input.gigya-input-password[name='password']") if el.is_displayed()]
    )
    password_fields[0].send_keys(password)

    submit_buttons = driver.find_elements(By.CSS_SELECTOR, "input.gigya-input-submit[type='submit']")
    visible_buttons = [b for b in submit_buttons if b.is_displayed()]
    if visible_buttons:
        driver.execute_script("arguments[0].click();", visible_buttons[0])

    print("Waiting for login to complete...")
    WebDriverWait(driver, 15).until(
        EC.presence_of_element_located((By.XPATH, "//*[contains(text(),'Mein Konto')]"))
    )
    print("Login successful")


def get_wishlist(email: str, password: str | None = None) -> dict[str, str | list[dict[str, str]]]:
    driver = None
    try:
        print(f"Starting Chrome WebDriver for {email[:3]}...")
        driver = webdriver.Chrome(options=get_chrome_options())
        driver.set_page_load_timeout(30)

        if password:
            print("Logging in to access user's wishlist...")
            driver.get("https://www.panini.de/shp_deu_de/customer/account/login/")
            _gigya_login(driver, email, password)

            print("Navigating to wishlist page...")
            driver.get("https://www.panini.de/shp_deu_de/wishlist/shared/")
            sleep(3)
        else:
            print("No password provided, accessing shared wishlist page...")
            driver.get("https://www.panini.de/shp_deu_de/wishlist/shared/")
            _click_cookie_consent(driver)
            sleep(3)

        print("Waiting for product items to load...")
        try:
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "ol.product-items"))
            )
            print("Product items loaded successfully")
        except Exception:
            print("Error waiting for product items")

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
        for _idx, item in enumerate(product_items):
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
        return {"message": "Failed to get wishlist. Please try again later.", "data": []}

    finally:
        if driver:
            print("Closing WebDriver...")
            driver.quit()