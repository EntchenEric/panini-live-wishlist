from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from time import sleep
import traceback
import os
from bs4 import BeautifulSoup

def examine_wishlist_page():
    """
    Examine the structure of the Panini wishlist page to help diagnose scraping issues
    """
    print("Starting page examination...")
    
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
    
    driver = None
    
    try:
        print("Starting Chrome WebDriver...")
        driver = webdriver.Chrome(options=options)
        driver.set_page_load_timeout(60)
        
        # First, check direct access to the shared wishlist
        print("\n--- CHECKING SHARED WISHLIST PAGE ---")
        driver.get("https://www.panini.de/shp_deu_de/wishlist/shared/")
        
        # Handle cookies
        try:
            print("Looking for cookie consent button...")
            WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Nur technische Cookies verwenden')]"))
            ).click()
            print("Clicked cookie consent button")
        except Exception as e:
            print(f"No cookie dialog found or couldn't click it: {e}")
            pass
        
        # Give the page some time to load
        print("Waiting for page to load...")
        sleep(5)
        
        # Save the page source
        page_source = driver.page_source
        with open("shared_wishlist_examination.html", "w", encoding="utf-8") as f:
            f.write(page_source)
        print("Saved page source to shared_wishlist_examination.html")
        
        # Parse with BeautifulSoup for analysis
        soup = BeautifulSoup(page_source, "lxml")
        
        # Check for common elements
        print("\nPage Analysis:")
        
        # Check title
        title = soup.title.string if soup.title else "No title found"
        print(f"Page title: {title}")
        
        # Check if it shows no shared wishlists
        no_wishlist_msg = soup.find(string=lambda text: "keine Wunschlisten" in text.lower() if text else False)
        if no_wishlist_msg:
            print("Page indicates there are no shared wishlists available")
            
        # Check for product containers
        product_containers = [
            ("li.product-item", len(soup.select("li.product-item"))),
            (".product-item", len(soup.select(".product-item"))),
            (".products-grid", len(soup.select(".products-grid"))),
            (".product-items", len(soup.select(".product-items"))),
            (".item.product", len(soup.select(".item.product"))),
        ]
        
        print("\nProduct container selectors:")
        for selector, count in product_containers:
            print(f"{selector}: {count} elements found")
            
        # Check for specific message texts
        message_elements = soup.select(".message")
        print("\nMessage elements:")
        for msg in message_elements:
            print(f"- {msg.get_text(strip=True)}")
            
        # Check page structure
        main_content = soup.select_one("main#maincontent")
        if main_content:
            print("\nMain content structure:")
            for child in main_content.children:
                if hasattr(child, 'name') and child.name is not None:
                    print(f"- {child.name}: class='{child.get('class', '')}'")
                    
        # Now try with login flow
        print("\n--- CHECKING WITH LOGIN FLOW ---")
        driver.get("https://www.panini.de/shp_deu_de/customer/account/login/")
        
        print("Please enter your Panini email address:")
        email = input()
        print("Please enter your Panini password:")
        password = input()
        
        # Fill login form
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
        
        # Wait for login to complete
        print("Waiting for login to complete...")
        try:
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.XPATH, "//span[contains(text(),'Mein Konto')]"))
            )
            print("Login successful")
            
            # Navigate to the wishlist page
            print("Navigating to wishlist...")
            driver.get("https://www.panini.de/shp_deu_de/wishlist/")
            sleep(5)
            
            # Save the logged-in wishlist page
            logged_in_source = driver.page_source
            with open("logged_in_wishlist.html", "w", encoding="utf-8") as f:
                f.write(logged_in_source)
            print("Saved logged-in wishlist to logged_in_wishlist.html")
            
            # Brief analysis of logged-in page
            soup = BeautifulSoup(logged_in_source, "lxml")
            
            # Check for wishlist items
            wishlist_items = soup.select("li.product-item")
            print(f"\nFound {len(wishlist_items)} product items on logged-in wishlist")
            
            # Check available wishlist actions
            wishlist_actions = soup.select(".actions-secondary a")
            print("\nAvailable wishlist actions:")
            for action in wishlist_actions[:5]:  # Show first 5 actions
                print(f"- {action.get_text(strip=True)}: {action.get('href', 'no-href')}")
                
            # Check if share button exists
            share_buttons = soup.select("button[title='Wunschliste teilen'], a[title='Wunschliste teilen']")
            if share_buttons:
                print("\nShare wishlist button found!")
            else:
                print("\nNo share wishlist button found")
                
            # Try to find the wishlist ID
            wishlist_id_elements = soup.select("[data-wishlist-id]")
            if wishlist_id_elements:
                wishlist_id = wishlist_id_elements[0].get('data-wishlist-id', 'unknown')
                print(f"Found wishlist ID: {wishlist_id}")
                
                # Try to access the shared wishlist with this ID
                print("\nTrying to access shared wishlist with ID...")
                driver.get(f"https://www.panini.de/shp_deu_de/wishlist/shared/index/code/{wishlist_id}/")
                sleep(5)
                
                # Save the shared wishlist page with ID
                shared_with_id_source = driver.page_source
                with open("shared_wishlist_with_id.html", "w", encoding="utf-8") as f:
                    f.write(shared_with_id_source)
                print("Saved shared wishlist with ID to shared_wishlist_with_id.html")
            
        except Exception as e:
            print(f"Error during login or wishlist access: {e}")
            traceback.print_exc()
            
    except Exception as e:
        print(f"Error during page examination: {e}")
        traceback.print_exc()
    finally:
        if driver:
            driver.quit()
        print("\nExamination complete. Check the saved HTML files for detailed information.")

if __name__ == "__main__":
    examine_wishlist_page() 