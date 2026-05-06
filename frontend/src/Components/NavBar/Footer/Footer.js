import { FaFacebookF, FaTwitter, FaInstagram } from "react-icons/fa";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="hf-footer">
      <div className="hf-left">
        <span>© 2026 Unisewana, Inc.</span>
        <a href="#">Privacy</a>
        <a href="#">Terms</a>
      </div>
      <div className="hf-right">
        <a href="#" aria-label="Facebook"><FaFacebookF /></a>
        <a href="#" aria-label="Twitter"><FaTwitter /></a>
        <a href="#" aria-label="Instagram"><FaInstagram /></a>
      </div>
    </footer>
  );
}