// This file now re-exports icons from the `react-icons` library instead
// of maintaining custom SVG elements. You can choose any icon set you prefer
// and update the imports accordingly.
// Make sure to run `pnpm add react-icons` if the package isn’t already present.

import {
  FiSearch,
  FiUser,
  FiHeart,
  FiShoppingCart,
  FiChevronDown,
  FiMenu,
  FiX,
  FiFacebook,
  FiInstagram,
  FiYoutube,
  FiLinkedin,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

// Re-export so existing imports stay the same throughout the codebase
export const SearchIcon = FiSearch;
export const UserIcon = FiUser;
export const HeartIcon = FiHeart;
export const CartIcon = FiShoppingCart;
export const ChevronDownIcon = FiChevronDown;
export const MenuIcon = FiMenu;
export const CloseIcon = FiX;
export const FacebookIcon = FiFacebook;
export const InstagramIcon = FiInstagram;
export const WhatsAppIcon = FaWhatsapp;
export const YouTubeIcon = FiYoutube;
export const LinkedInIcon = FiLinkedin;
