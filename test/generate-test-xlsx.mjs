import XLSX from "xlsx";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const students = [
  { Name: "Shalin Bhattarai", Email: "bhattaraisalin10@gmail.com" },
  { Name: "Shalin Bhattarai (alt)", Email: "bhattaraishalin10@gmail.com" },
  { Name: "Aarav Sharma", Email: "aarav.sharma@university.edu" },
  { Name: "Priya Patel", Email: "priya.patel@university.edu" },
  { Name: "Rohan Gupta", Email: "rohan.gupta@university.edu" },
  { Name: "Ananya Singh", Email: "ananya.singh@university.edu" },
  { Name: "Kabir Mehta", Email: "kabir.mehta@university.edu" },
  { Name: "Isha Reddy", Email: "isha.reddy@university.edu" },
  { Name: "Arjun Nair", Email: "arjun.nair@university.edu" },
  { Name: "Meera Joshi", Email: "meera.joshi@university.edu" },
  { Name: "Vikram Rao", Email: "vikram.rao@university.edu" },
  { Name: "Diya Kapoor", Email: "diya.kapoor@university.edu" },
  { Name: "Aditya Kumar", Email: "aditya.kumar@university.edu" },
  { Name: "Sanya Verma", Email: "sanya.verma@university.edu" },
  { Name: "Nikhil Bose", Email: "nikhil.bose@university.edu" },
  { Name: "Riya Thapa", Email: "riya.thapa@university.edu" },
  { Name: "Karan Malhotra", Email: "karan.malhotra@university.edu" },
  { Name: "Pooja Iyer", Email: "pooja.iyer@university.edu" },
  { Name: "Siddharth Das", Email: "siddharth.das@university.edu" },
  { Name: "Neha Choudhury", Email: "neha.choudhury@university.edu" },
  { Name: "Rahul Pandey", Email: "rahul.pandey@university.edu" },
  { Name: "Tanya Saxena", Email: "tanya.saxena@university.edu" },
  { Name: "Manish Tiwari", Email: "manish.tiwari@university.edu" },
  { Name: "Shreya Ghosh", Email: "shreya.ghosh@university.edu" },
  { Name: "Deepak Mishra", Email: "deepak.mishra@university.edu" },
  { Name: "Kavya Pillai", Email: "kavya.pillai@university.edu" },
  { Name: "Amit Chauhan", Email: "amit.chauhan@university.edu" },
  { Name: "Nisha Agarwal", Email: "nisha.agarwal@university.edu" },
  { Name: "Raj Kulkarni", Email: "raj.kulkarni@university.edu" },
  { Name: "Simran Kaur", Email: "simran.kaur@university.edu" },
  { Name: "Harsh Desai", Email: "harsh.desai@university.edu" },
  { Name: "Anjali Menon", Email: "anjali.menon@university.edu" },
  { Name: "Pranav Shetty", Email: "pranav.shetty@university.edu" },
  { Name: "Divya Banerjee", Email: "divya.banerjee@university.edu" },
  { Name: "Suresh Hegde", Email: "suresh.hegde@university.edu" },
  { Name: "Ritika Dubey", Email: "ritika.dubey@university.edu" },
  { Name: "Gaurav Sethi", Email: "gaurav.sethi@university.edu" },
  { Name: "Pallavi Rajan", Email: "pallavi.rajan@university.edu" },
  { Name: "Varun Bhatt", Email: "varun.bhatt@university.edu" },
  { Name: "Megha Srivastava", Email: "megha.srivastava@university.edu" },
  { Name: "Akash Tripathi", Email: "akash.tripathi@university.edu" },
  { Name: "Swati Mohan", Email: "swati.mohan@university.edu" },
];

const ws = XLSX.utils.json_to_sheet(students);

ws["!cols"] = [{ wch: 25 }, { wch: 35 }];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Class List");

const outPath = join(__dirname, "class-list.xlsx");
const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
writeFileSync(outPath, buf);

console.log(`Created ${outPath} with ${students.length} students`);
