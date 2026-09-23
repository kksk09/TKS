const { Client } = require("@notionhq/client");
const fs = require("fs");

// ================== ตั้งค่า ==================
const NOTION_TOKEN = "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";
const DATABASE_ID = "086e547f7b06430b84dbd082ba3824ea";
const YEAR = process.argv[2] ? parseInt(process.argv[2]) : 2026;
// ============================================

const notion = new Client({ auth: NOTION_TOKEN });

async function fetchDataByYear(year) {
  try {
    console.log(`\nกำลังดึงข้อมูลปี ${year}...\n`);

    const database = await notion.databases.retrieve({ database_id: DATABASE_ID });
    const dataSourceId = database.data_sources[0].id;
    console.log("Data Source ID:", dataSourceId);

    const startOfYear = `${year}-01-01`;
    const endOfYear = `${year}-12-31`;

    // ========== 1. ดึงรายการหลักทั้งหมด ==========
    let allResults = [];
    let hasMore = true;
    let startCursor = undefined;

    while (hasMore) {
      const response = await notion.dataSources.query({
        data_source_id: dataSourceId,
        start_cursor: startCursor,
        page_size: 100,
        filter: {
          and: [
            { property: "Date", date: { on_or_after: startOfYear } },
            { property: "Date", date: { on_or_before: endOfYear } }
          ]
        },
        sorts: [{ property: "Date", direction: "descending" }]
      });

      allResults = allResults.concat(response.results);
      hasMore = response.has_more;
      startCursor = response.next_cursor;
      console.log(`ดึงมาแล้ว ${allResults.length} รายการ...`);
    }

    console.log(`\nรวม ${allResults.length} รายการของปี ${year}`);
    console.log("กำลังรวบรวม Employee IDs...");

    // ========== 2. เก็บ Employee relation IDs ทั้งหมด ==========
    const employeeIdSet = new Set();

    allResults.forEach(page => {
      const rel = page.properties.Employee?.relation || [];
      rel.forEach(r => employeeIdSet.add(r.id));
    });

    const employeeIds = [...employeeIdSet];
    console.log(`พบ Employee ที่เกี่ยวข้อง ${employeeIds.length} คน`);

    // ========== 3. ดึงชื่อ Employee ทีละชุด (เร็วขึ้น) ==========
    const employeeNameMap = {}; // id → name

    for (let i = 0; i < employeeIds.length; i++) {
      const id = employeeIds[i];
      try {
        const page = await notion.pages.retrieve({ page_id: id });

        let name = "ไม่ทราบชื่อ";
        for (const key of Object.keys(page.properties)) {
          if (page.properties[key].type === "title" && page.properties[key].title?.length > 0) {
            name = page.properties[key].title.map(t => t.plain_text).join("");
            break;
          }
        }
        employeeNameMap[id] = name;
      } catch (err) {
        employeeNameMap[id] = "(ไม่มีสิทธิ์เข้าถึง)";
      }

      if ((i + 1) % 20 === 0 || i === employeeIds.length - 1) {
        console.log(`ดึงชื่อ Employee แล้ว ${i + 1}/${employeeIds.length}`);
      }
    }

    // ========== 4. แปลงข้อมูลหลัก ==========
    console.log("กำลังจัดรูปแบบข้อมูล...");

    const cleanData = allResults.map(page => {
      const props = page.properties;

      // Title
      let title = "ไม่มีชื่อ";
      if (props.Task?.title?.length > 0) {
        title = props.Task.title.map(t => t.plain_text).join("");
      }

      // Date
      const date = props.Date?.date?.start || null;
      const end = props.Date?.date?.end || null;

      // NOTE
      let note = "";
      if (props.NOTE?.rich_text?.length > 0) {
        note = props.NOTE.rich_text.map(t => t.plain_text).join("");
      }

      // Employee (จาก relation ที่ดึงมาแล้ว)
      let employees = [];
      const rel = props.Employee?.relation || [];
      employees = rel.map(r => employeeNameMap[r.id] || "ไม่ทราบชื่อ");

      // คนรับผิดชอบ (multi_select)
      let responsible = [];
      if (props["คนรับผิดชอบ"]?.multi_select) {
        responsible = props["คนรับผิดชอบ"].multi_select.map(s => s.name);
      }

      // รวมคน
      const allPeople = [...new Set([...employees, ...responsible])];

      return {
        id: page.id,
        title,
        date,
        end,
        note,
        employees: allPeople,
        employeesText: allPeople.join(", "),
        last_edited: page.last_edited_time,
        url: page.url
      };
    });

    // ========== 5. บันทึก ==========
    fs.writeFileSync(`data-${year}.json`, JSON.stringify(cleanData, null, 2));
    fs.writeFileSync("data.json", JSON.stringify(cleanData, null, 2));

    console.log(`\n✅ บันทึกสำเร็จ! data.json`);
    const withPeople = cleanData.filter(d => d.employees.length > 0);
    console.log(`รายการที่มีชื่อคน: ${withPeople.length} / ${cleanData.length}`);

  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาด:", error.message);
    if (error.body) console.error(JSON.stringify(error.body, null, 2));
  }
}

fetchDataByYear(YEAR);