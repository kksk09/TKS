const { Client } = require("@notionhq/client");

const notion = new Client({ auth: "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" });

async function checkOnePage() {
  const pageId = "3d6770a5-c90b-80ac-a108-f17882532d23"; // id จากที่คุณส่งมา

  const page = await notion.pages.retrieve({ page_id: pageId });
  const emp = page.properties.Employee;

  console.log("=== Employee Property ===");
  console.log("type:", emp?.type);
  console.log("relation:", JSON.stringify(emp?.relation, null, 2));
  console.log("=========================");

  // ถ้ามี relation ให้ลองดึงหน้าแรกดู
  if (emp?.relation?.length > 0) {
    const relatedId = emp.relation[0].id;
    console.log("\nกำลังดึง related page:", relatedId);

    try {
      const related = await notion.pages.retrieve({ page_id: relatedId });
      console.log("Related page properties keys:", Object.keys(related.properties));

      // หา title
      for (const [key, val] of Object.entries(related.properties)) {
        if (val.type === "title") {
          console.log("Title ของ related:", val.title?.[0]?.plain_text);
        }
      }
    } catch (err) {
      console.error("ดึง related page ไม่ได้:", err.message);
    }
  } else {
    console.log("ไม่มี relation ใน property Employee ของหน้านี");
  }
}

checkOnePage();