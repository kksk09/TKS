import json
import requests # type: ignore

# https://app.notion.com/p/tsukasabangkok/086e547f7b06430b84dbd082ba3824ea?v=3c39393f5e124387afeb1ace78e8aa78
# db_id = 086e547f7b06430b84dbd082ba3824ea
# Internal Integration Token = 
# assetsVersion=23.13.20260903.0022
# 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

# กำหนดค่ากำหนดการเชื่อมต่อ
NOTION_TOKEN = "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"
DATABASE_ID = "086e547f7b06430b84dbd082ba3824ea"

url = f"https://api.notion.com/v1/databases/{DATABASE_ID}/query"


headers = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28",  # ปรับเปลี่ยนตามเวอร์ชันที่เลือกใช้
}

# หากต้องการดึงทั้งหมด สามารถส่ง Object ว่าง {} ไปใน Body ได้
payload = {}

response = requests.post(url, json=payload, headers=headers)

if response.status_code == 200:
    data = response.json()

    # บันทึกผลลัพธ์โครงสร้าง JSON ลงไฟล์
    with open("calendar.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

    print("ดึงข้อมูลสำเร็จ! บันทึกไฟล์เป็น calendar.json เรียบร้อยแล้ว")
else:
    print(f"เกิดข้อผิดพลาด: {response.status_code}")
    print(response.text)
