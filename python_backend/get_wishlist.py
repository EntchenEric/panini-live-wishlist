import imaplib
from email.header import decode_header
from dotenv import load_dotenv
import os
from email import message_from_string
from bs4 import BeautifulSoup

load_dotenv()

username = os.getenv("EMAIL_USER")
password = os.getenv("EMAIL_PASSWORD")
imap_server = os.getenv("IMAP_SERVER")

def get_wishlist(email: str):
    mail = imaplib.IMAP4_SSL(imap_server)
    mail.login(username, password)

    mail.select("Notification")

    _, messages = mail.search(None, "ALL")
    email_ids = messages[0].split()

    for email_id in email_ids:
        _, msg_data = mail.fetch(email_id, "(RFC822)")

        for response_part in msg_data:
            if isinstance(response_part, tuple):
                byte_data = response_part[1]
                
                # Check if the data is a string, then convert to bytes
                if isinstance(byte_data, str):
                    byte_data = byte_data.encode('utf-8')
                
                # Parse email as string if needed
                msg = message_from_string(byte_data.decode('utf-8'))

                subject, encoding = decode_header(msg["Subject"])[0]
                if isinstance(subject, bytes):
                    subject = subject.decode(encoding if encoding else "utf-8")

                body = None
                if msg.is_multipart():
                    for part in msg.walk():
                        content_type = part.get_content_type()
                        content_disposition = str(part.get("Content-Disposition"))

                        if content_type == "text/html" and "attachment" not in content_disposition:
                            body = part.get_payload(decode=True).decode(part.get_content_charset(), errors="ignore")
                            break
                        elif content_type == "text/plain" and body is None:
                            body = part.get_payload(decode=True).decode(part.get_content_charset(), errors="ignore")

                else:
                    body = msg.get_payload(decode=True).decode(msg.get_content_charset(), errors="ignore")

                if body:
                    soup = BeautifulSoup(body, "lxml")
                    message_tag = soup.find("table", class_="message-info").find("h3")
                    full_message = message_tag.find_parent("td").get_text(strip=True)
                    message = full_message.replace(message_tag.get_text(strip=True), "").strip()

                    if email.lower() in message.lower():
                        print(f"Found the email with desired content: {message}")

                        datas = []
                        for data in soup.find_all("td", class_="col product"):
                            title_tag = data.find_all("p")[1]
                            name = title_tag.find("strong").get_text(strip=True)
                            link = title_tag.find("a").get("href")
                            img_tag = data.find("img", class_="product-image-photo")
                            img_url = img_tag.get("data-src") or img_tag.get("src")
                            img_url = img_url.replace("produc=t", "product").replace("collection-=", "collection-")
                            if "/cache/" in img_url:
                                new_url = img_url.split("/cache/")[1]
                                img_url = img_url.split("/cache/")[0] + "/" + "/".join(new_url.split("/")[1:])

                            datas.append({
                                "name": name,
                                "link": link,
                                "image": img_url
                            })

                        return {"message": message, "data": datas}

    mail.close()
    mail.logout()
