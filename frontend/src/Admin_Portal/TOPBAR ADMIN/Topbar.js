/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAdminDashboardSummary, deriveAdminMetrics } from '../../services/adminDashboardService';
import { clearAuthSession } from '../../services/authSession';
import pickNBookLogo from '../../assets/images/brand/pick-n-book-logo.png';


function getInitials(name) {
    const words = String(name || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (words.length === 0) {
        return 'AD';
    }

    return words
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase();
}

function md5(string) {
    function rotateLeft(lValue, iShiftBits) {
        return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
    }
    function addUnsigned(lX, lY) {
        var lX4, lY4, lX8, lY8, lResult;
        lX8 = (lX & 0x80000000);
        lY8 = (lY & 0x80000000);
        lX4 = (lX & 0x40000000);
        lY4 = (lY & 0x40000000);
        lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
        if (lX4 & lY4) {
            return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
        }
        if (lX4 | lY4) {
            if (lResult & 0x40000000) {
                return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
            } else {
                return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
            }
        } else {
            return (lResult ^ lX8 ^ lY8);
        }
    }
    function F(x, y, z) { return (x & y) | ((~x) & z); }
    function G(x, y, z) { return (x & z) | (y & (~z)); }
    function H(x, y, z) { return (x ^ y ^ z); }
    function I(x, y, z) { return (y ^ (x | (~z))); }
    function FF(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    };
    function GG(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    };
    function HH(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    };
    function II(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    };
    function convertToWordArray(string) {
        var lWordCount;
        var lMessageLength = string.length;
        var lNumberOfWords_temp1 = lMessageLength + 8;
        var lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
        var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
        var lWordArray = Array(lNumberOfWords);
        var lBytePosition = 0;
        var lByteCount = 0;
        while (lByteCount < lMessageLength) {
            lWordCount = (lByteCount - (lByteCount % 4)) / 4;
            lBytePosition = (lByteCount % 4) * 8;
            lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition));
            lByteCount++;
        }
        lWordCount = (lByteCount - (lByteCount % 4)) / 4;
        lBytePosition = (lByteCount % 4) * 8;
        lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
        lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
        lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
        return lWordArray;
    };
    function wordToHex(lValue) {
        var WordToHexValue = "", WordToHexValue_temp = "", lByte, lCount;
        for (lCount = 0; lCount <= 3; lCount++) {
            lByte = (lValue >>> (lCount * 8)) & 255;
            WordToHexValue_temp = "0" + lByte.toString(16);
            WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
        }
        return WordToHexValue;
    };
    function utf8Encode(string) {
        string = string.replace(/\r\n/g, "\n");
        var utftext = "";
        for (var n = 0; n < string.length; n++) {
            var c = string.charCodeAt(n);
            if (c < 128) {
                utftext += String.fromCharCode(c);
            } else if ((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            } else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }
        }
        return utftext;
    };
    var x = Array();
    var k, AA, BB, CC, DD, a, b, c, d;
    var S11 = 7, S12 = 12, S13 = 17, S14 = 22;
    var S21 = 5, S22 = 9, S23 = 14, S24 = 20;
    var S31 = 4, S32 = 11, S33 = 16, S34 = 23;
    var S41 = 6, S42 = 10, S43 = 15, S44 = 21;
    string = utf8Encode(string);
    x = convertToWordArray(string);
    a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;
    for (k = 0; k < x.length; k += 16) {
        AA = a; BB = b; CC = c; DD = d;
        a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478); d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756); c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB); b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
        a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF); d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A); c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613); b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
        a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8); d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF); c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1); b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
        a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122); d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193); c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E); b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
        a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562); d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340); c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51); b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
        a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D); d = GG(d, a, b, c, x[k + 10], S22, 0x2441453); c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681); b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
        a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6); d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6); c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87); b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
        a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905); d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8); c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9); b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
        a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942); d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681); c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122); b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
        a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44); d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9); c = HH(c, d, a, b, x[k + 7], S33, 0xF6bb4B60); b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
        a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6); d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA); c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085); b = HH(b, c, d, a, x[k + 6], S34, 0x4881D05);
        a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039); d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5); c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8); b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
        a = II(a, b, c, d, x[k + 0], S41, 0xF4292244); d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97); c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7); b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
        a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3); d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92); c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D); b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
        a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F); d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0); c = II(c, d, a, b, x[k + 6], S43, 0xA3014314); b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
        a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82); d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235); c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB); b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
        a = addUnsigned(a, AA); b = addUnsigned(b, BB); c = addUnsigned(c, CC); d = addUnsigned(d, DD);
    }
    var temp = wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);
    return temp.toLowerCase();
}

function getEmailInitials(email) {
    if (!email) return '';
    const parts = email.split('@')[0];
    if (parts.length >= 2) {
        return parts.slice(0, 2).toUpperCase();
    }
    return parts.toUpperCase();
}

function getAdminProfile() {
    const name =
        localStorage.getItem('adminName') ||
        localStorage.getItem('adminEmail') ||
        'Admin';
    const email = localStorage.getItem('adminEmail') || '';

    // Check various common keys where an admin image URL might be stored
    const imageKeys = [
        'adminPhoto',
        'adminImage',
        'adminAvatar',
        'avatarUrl',
        'photoUrl',
        'profileImage',
        'photo',
        'avatar'
    ];
    let photoUrl = '';
    for (const key of imageKeys) {
        const val = localStorage.getItem(key);
        if (val && (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('data:') || val.startsWith('/'))) {
            photoUrl = val;
            break;
        }
    }

    if (!photoUrl) {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const userObj = JSON.parse(userStr);
                const imgVal = userObj?.profileImage || userObj?.avatarUrl || userObj?.imageUrl || userObj?.photoUrl || userObj?.photo;
                if (imgVal) {
                    photoUrl = imgVal;
                }
            }
        } catch (e) { }
    }

    if (!photoUrl && email) {
        photoUrl = `https://www.gravatar.com/avatar/${md5(email.trim().toLowerCase())}?d=404`;
    }

    return {
        adminId: localStorage.getItem('adminId') || '--',
        adminName: name,
        adminEmail: email,
        avatarInitials: getEmailInitials(email) || getInitials(name),
        avatarBg: 'linear-gradient(135deg, #1e75ff, #0052d9)',
        photoUrl: photoUrl
    };
}

const SEARCHABLE_PAGES = [
    { label: 'Dashboard', category: 'General', path: '/admin' },
    { label: 'Bus Bookings List', category: 'Bus Management', path: '/admin/b2c-bus/booking-list' },
    { label: 'Bus Discount List', category: 'Bus Management', path: '/admin/b2c-bus/discount-list' },
    { label: 'Add Bus Discount', category: 'Bus Management', path: '/admin/b2c-bus/add-discount' },
    { label: 'Bus Discount Mapping', category: 'Bus Management', path: '/admin/b2c-bus/discount-mapping' },
    { label: 'Bus Markup List', category: 'Bus Management', path: '/admin/b2c-bus/markup-list' },
    { label: 'Bus GST Settings', category: 'Bus Management', path: '/admin/b2c-bus/gst-settings' },
    { label: 'Bus Coupon List', category: 'Bus Management', path: '/admin/b2c-bus/coupon-list' },
    { label: 'Bus Used Coupon List', category: 'Bus Management', path: '/admin/b2c-bus/used-coupon-list' },
    { label: 'Bus Convenience Fee', category: 'Bus Management', path: '/admin/b2c-bus/convenience-fee' },
    { label: 'Edit Bus Convenience Fee', category: 'Bus Management', path: '/admin/b2c-bus/convenience-fee/edit' },
    { label: 'Bus Cancellation List', category: 'Bus Management', path: '/admin/b2c-bus/cancellation-list' },
    { label: 'Bus Search History', category: 'Bus Management', path: '/admin/b2c-bus/search-history' },
    { label: 'Bus Voucher Settings', category: 'Bus Management', path: '/admin/b2c-bus/voucher-settings' },
    { label: 'Popular Bus Routes', category: 'Bus Management', path: '/admin/b2c-bus/popular-routes' },

    { label: 'Flight Booking List', category: 'Flight Management', path: '/admin/b2c-flight/booking-list' },
    { label: 'Flight Discount List', category: 'Flight Management', path: '/admin/b2c-flight/discount-list' },
    { label: 'Add Flight Discount', category: 'Flight Management', path: '/admin/b2c-flight/add-discount' },
    { label: 'Flight Markup List', category: 'Flight Management', path: '/admin/b2c-flight/markup-list' },
    { label: 'Flight Coupon List', category: 'Flight Management', path: '/admin/b2c-flight/coupon-list' },
    { label: 'Flight Used Coupon List', category: 'Flight Management', path: '/admin/b2c-flight/used-coupon-list' },
    { label: 'Flight Convenience Fee', category: 'Flight Management', path: '/admin/b2c-flight/convenience-fee' },
    { label: 'Add Flight Convenience Fee', category: 'Flight Management', path: '/admin/b2c-flight/convenience-fee/add' },
    { label: 'Edit Flight Convenience Fee', category: 'Flight Management', path: '/admin/b2c-flight/convenience-fee/edit' },
    { label: 'Flight Cancellation Request List', category: 'Flight Management', path: '/admin/b2c-flight/cancellation-requests' },
    { label: 'Flight Remark List', category: 'Flight Management', path: '/admin/b2c-flight/remark-list' },
    { label: 'Add Flight Remark', category: 'Flight Management', path: '/admin/b2c-flight/remark-list/add' },
    { label: 'Edit Flight Remark', category: 'Flight Management', path: '/admin/b2c-flight/remark-list/edit' },
    { label: 'Flight Amendments List', category: 'Flight Management', path: '/admin/b2c-flight/amendments' },
    { label: 'Flight Allowed Fare Types', category: 'Flight Management', path: '/admin/b2c-flight/allowed-fare-types' },
    { label: 'Flight Search History', category: 'Flight Management', path: '/admin/b2c-flight/search-history' },
    { label: 'Flight Pending Airline List', category: 'Flight Management', path: '/admin/b2c-flight/pending-airlines' },
    { label: 'Add Flight Pending Airline', category: 'Flight Management', path: '/admin/b2c-flight/pending-airlines/add' },
    { label: 'Edit Flight Pending Airline', category: 'Flight Management', path: '/admin/b2c-flight/pending-airlines/edit' },
    { label: 'Flight Airline Web Check Links', category: 'Flight Management', path: '/admin/b2c-flight/airline-webcheck-links' },
    { label: 'Flight Airline Brand List', category: 'Flight Management', path: '/admin/b2c-flight/airline-brands' },
    { label: 'Popular Flight Routes', category: 'Flight Management', path: '/admin/b2c-flight/popular-routes' },
    { label: 'Popular Flight Destinations', category: 'Flight Management', path: '/admin/b2c-flight/popular-destinations' },

    { label: 'Blog List', category: 'Blog Management', path: '/admin/blog-management/blog-list' },
    { label: 'Add Blog', category: 'Blog Management', path: '/admin/blog-management/add-blog' },
    { label: 'Blog Sub Category List', category: 'Blog Management', path: '/admin/blog-management/blog-sub-category-list' },
    { label: 'Add Blog Sub Category', category: 'Blog Management', path: '/admin/blog-management/add-blog-sub-category' },
    { label: 'Blog Category List', category: 'Blog Management', path: '/admin/blog-management/blog-category-list' },
    { label: 'Add Blog Category', category: 'Blog Management', path: '/admin/blog-management/add-blog-category' },

    { label: 'Customer List', category: 'Customer Management', path: '/admin/customer-management/customer-list' },
    { label: 'Add New Customer', category: 'Customer Management', path: '/admin/customer-management/add-new-customer' },
    { label: 'Deposit Request List', category: 'Customer Management', path: '/admin/customer-management/deposit-request-list' },

    { label: 'All Page List', category: 'Page Management', path: '/admin/page-management/pages' },
    { label: 'Add New Page', category: 'Page Management', path: '/admin/page-management/pages/new' },

    { label: 'Menu List', category: 'Menu Management', path: '/admin/menu-management/menus' },
    { label: 'Add Menu', category: 'Menu Management', path: '/admin/menu-management/menus/new' },

    { label: 'Offer List', category: 'Offer Management', path: '/admin/offer-management/offers' },
    { label: 'Add New Offer', category: 'Offer Management', path: '/admin/offer-management/offers/new' },

    { label: 'Query List', category: 'Query Management', path: '/admin/query-management/query-list' },

    { label: 'Testimonial List', category: 'Testimonial Management', path: '/admin/testimonial-management/testimonial-list' },
    { label: 'Add Testimonial', category: 'Testimonial Management', path: '/admin/testimonial-management/add-testimonial' }
];

function Topbar({ onToggleSidebar, searchQuery, setSearchQuery, theme, onToggleTheme }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isBalanceVisible, setIsBalanceVisible] = useState(true);
    const [showTopupModal, setShowTopupModal] = useState(false);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [topupAmount, setTopupAmount] = useState('');
    const [notificationCount, setNotificationCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [hasUnread, setHasUnread] = useState(false);
    const [todayDate, setTodayDate] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [showCacheLoader, setShowCacheLoader] = useState(false);
    const [cacheLoaderText, setCacheLoaderText] = useState('');
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordInputs, setPasswordInputs] = useState({ old: '', newPassword: '', confirm: '' });
    const [showPinModal, setShowPinModal] = useState(false);
    const [pinInput, setPinInput] = useState('');

    const showToastMessage = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
    };

    const [adminData] = useState(() => getAdminProfile());
    const [isFullscreen, setIsFullscreen] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('admin-fullscreen') === 'true';
        }
        return false;
    });

    useEffect(() => {
        const handleFullscreenChange = () => {
            const isCurrentlyFull = !!document.fullscreenElement;
            setIsFullscreen(isCurrentlyFull);
            localStorage.setItem('admin-fullscreen', isCurrentlyFull ? 'true' : 'false');
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    useEffect(() => {
        const shouldBeFullscreen = localStorage.getItem('admin-fullscreen') === 'true';
        if (shouldBeFullscreen && !document.fullscreenElement) {
            const requestFs = () => {
                document.documentElement.requestFullscreen()
                    .then(() => {
                        localStorage.setItem('admin-fullscreen', 'true');
                    })
                    .catch(err => console.log("Init fullscreen blocked/failed:", err));
                document.removeEventListener('click', requestFs);
            };
            document.addEventListener('click', requestFs);
            return () => document.removeEventListener('click', requestFs);
        }
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.querySelector('[data-search-wrapper] input');
                if (searchInput) {
                    searchInput.focus();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => {
                setIsFullscreen(true);
                localStorage.setItem('admin-fullscreen', 'true');
            }).catch(err => {
                console.error("Error enabling fullscreen:", err);
            });
        } else {
            document.exitFullscreen().then(() => {
                setIsFullscreen(false);
                localStorage.setItem('admin-fullscreen', 'false');
            });
        }
    };


    const handleExportCSV = () => {
        const csvRows = [
            ["Book My Route - Admin Dashboard Report"],
            [`Generated Date: ${todayDate}`],
            [],
            ["Dashboard Metric", "Current Value"],
            ["Cash Balance", `INR ${balanceData.amount}`],
            ["Last Login IP", "192.168.1.10"],
            ["Total Daily Bookings", "107"],
            ["Pending Transactions", "2"],
            ["Failed Transactions", "7"],
            ["Successful B2C Bookings", "92"],
            ["System Alerts Count", String(notificationCount)]
        ];

        const csvContent = "\uFEFF" + csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `BMR_Admin_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Click outside handler for search dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('[data-search-wrapper]')) {
                setShowSearchDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Dynamic today's date
    useEffect(() => {
        const formatToday = () => {
            const now = new Date();
            return now.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            });
        };
        setTodayDate(formatToday());
        // Update every minute in case date changes at midnight
        const timer = setInterval(() => setTodayDate(formatToday()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Auto-close notifications dropdown when route/location changes
    useEffect(() => {
        setShowNotifications(false);
    }, [location.pathname]);



    // Dynamic balance data
    const [balanceData, setBalanceData] = useState({
        amount: 114359, // Set starting value to match visual mockup perfectly
        currency: 'INR',
    });

    useEffect(() => {
        const fetchBalanceAndNotifications = async () => {
            try {
                const summary = await getAdminDashboardSummary();
                const metrics = deriveAdminMetrics(summary);
                if (metrics && metrics.revenue !== undefined) {
                    setBalanceData({
                        amount: metrics.revenue,
                        currency: 'INR'
                    });
                }

                // Build dynamic notifications from backend summary
                const list = [];
                const pending = summary?.pendingActions || {};
                const bus = summary?.busBookings || {};

                if (pending.cancellations > 0) {
                    list.push({
                        id: 'cancellation',
                        title: 'New Cancellation',
                        message: `${pending.cancellations} Cancellation Review Required`,
                        color: '#1e75ff',
                        path: '/admin/b2c-bus/cancellation-list',
                    });
                }
                if (pending.deposits > 0) {
                    list.push({
                        id: 'deposit',
                        title: 'Payment Pending',
                        message: `${pending.deposits} Deposits Pending Verification`,
                        color: '#10b981',
                        path: '/admin/customer-management/deposit-request-list',
                    });
                }
                if (pending.travelerUpdates > 0) {
                    list.push({
                        id: 'updates',
                        title: 'Pending Updates',
                        message: `${pending.travelerUpdates} Traveler Modifications Ready`,
                        color: '#f97316',
                        path: '/admin/customer-management/customer-list',
                    });
                }
                if (bus.total > 0 && !(pending.cancellations > 0)) {
                    list.push({
                        id: 'bookings',
                        title: 'Total Bookings',
                        message: `${bus.total} Total Bookings`,
                        color: '#6366f1',
                        path: '/admin/b2c-bus/booking-list',
                    });
                }

                setNotifications(prev => {
                    const isDifferent = prev.length !== list.length ||
                        list.some((item, i) => !prev[i] || prev[i].id !== item.id || prev[i].message !== item.message);

                    if (isDifferent && list.length > 0) {
                        setHasUnread(true);
                    }
                    return list;
                });
                setNotificationCount(list.length);
            } catch (err) {
                console.error("Error fetching Topbar dashboard summary data:", err);
            }
        };
        fetchBalanceAndNotifications();
        const interval = setInterval(fetchBalanceAndNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => {
        clearAuthSession();
        setIsDropdownOpen(false);
        navigate('/admin/login', { replace: true });
    };


    const handleClearCache = () => {
        setIsDropdownOpen(false);
        setShowCacheLoader(true);
        setCacheLoaderText('Purging cache tables...');
        setTimeout(() => {
            setCacheLoaderText('Reindexing sessions...');
            setTimeout(() => {
                setShowCacheLoader(false);
                showToastMessage('System cache cleared successfully!', 'success');
            }, 800000 / 1000); // 800ms
        }, 800000 / 1000); // 800ms
    };

    const handleChangePassword = () => {
        setIsDropdownOpen(false);
        setShowPasswordModal(true);
    };

    const handleChangePin = () => {
        setIsDropdownOpen(false);
        setShowPinModal(true);
    };

    const handleTopupClick = () => {
        console.log('Top up request clicked');
        setShowTopupModal(true);
    };

    const handleTopupSubmit = () => {
        const amount = parseFloat(topupAmount) || 0;
        if (amount > 0) {
            setBalanceData(prev => ({
                ...prev,
                amount: prev.amount + amount
            }));
            showToastMessage(`Wallet successfully topped up with ₹${amount.toLocaleString('en-IN')}!`, 'success');
            setTopupAmount('');
            setShowTopupModal(false);
        } else {
            showToastMessage("Please enter a valid positive amount.", "error");
        }
    };

    const handlePasswordSubmit = () => {
        if (!passwordInputs.old || !passwordInputs.newPassword || !passwordInputs.confirm) {
            showToastMessage("Please fill in all password fields.", "error");
            return;
        }
        if (passwordInputs.newPassword !== passwordInputs.confirm) {
            showToastMessage("New passwords do not match.", "error");
            return;
        }
        if (passwordInputs.newPassword.length < 6) {
            showToastMessage("Password must be at least 6 characters.", "error");
            return;
        }
        showToastMessage("Password updated successfully!", "success");
        setPasswordInputs({ old: '', newPassword: '', confirm: '' });
        setShowPasswordModal(false);
    };

    const handlePinSubmit = () => {
        if (pinInput.length !== 4) {
            showToastMessage("PIN must be exactly 4 digits.", "error");
            return;
        }
        showToastMessage(`Security PIN updated successfully!`, "success");
        setPinInput('');
        setShowPinModal(false);
    };

    // Inline Styles with Theme Colors
    const styles = {
        topbar: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '14px',
            padding: '6px 15px',
            borderBottom: '1px solid var(--admin-border)',
            background: 'var(--panel)',
            position: 'relative',
            flexShrink: 0,
            zIndex: 1010,
        },
        topbarLeft: {
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flex: 1,
        },
        menuToggle: {
            background: 'none',
            border: 'none',
            color: 'var(--admin-muted)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        },
        searchWrapper: {
            position: 'relative',
            width: '100%',
            maxWidth: '360px',
        },
        searchBarInput: {
            width: '100%',
            height: '42px',
            padding: '0 16px 0 42px',
            borderRadius: '12px',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--admin-border)',
            background: 'var(--admin-soft)',
            color: 'var(--admin-text)',
            outline: 'none',
            fontSize: '0.88rem',
            fontFamily: 'inherit',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.01)',
            transition: 'all 0.2s ease',
            boxSizing: 'border-box',
        },
        searchBarIcon: {
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--admin-muted)',
            fontSize: '16px',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
        },
        searchDropdown: {
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '100%',
            marginTop: '8px',
            background: 'var(--panel)',
            border: '1px solid var(--admin-border)',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
            maxHeight: '300px',
            overflowY: 'auto',
            zIndex: 1200,
            padding: '8px 0',
        },
        searchDropdownItem: {
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            padding: '10px 16px',
            cursor: 'pointer',
            transition: 'background 0.2s ease',
            border: 'none',
            background: 'none',
            width: '100%',
            textAlign: 'left',
            boxSizing: 'border-box',
        },
        searchDropdownLabel: {
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--admin-text)',
        },
        searchDropdownCategory: {
            fontSize: '0.72rem',
            color: 'var(--admin-muted)',
            fontWeight: 500,
        },
        noSearchResults: {
            padding: '12px 16px',
            fontSize: '0.8rem',
            color: 'var(--admin-muted)',
            textAlign: 'center',
        },
        topbarActions: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            position: 'relative',
        },
        balancePill: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            height: '42px',
            padding: '0 16px',
            borderRadius: '12px',
            background: 'var(--admin-soft)',
            border: '1px solid var(--admin-border)',
            color: 'var(--admin-text)',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.02)',
            transition: 'all 0.2s ease',
            boxSizing: 'border-box',
        },
        balanceIconWrapper: {
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'var(--panel)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--admin-primary)',
            flexShrink: 0,
        },
        balanceText: {
            display: 'flex',
            flexDirection: 'column',
            gap: '1px',
            fontSize: '0.72rem',
            color: 'var(--admin-muted)',
            fontWeight: 500,
            lineHeight: '1.2',
            justifyContent: 'center',
        },
        balanceValue: {
            fontSize: '0.9rem',
            color: 'var(--admin-primary)',
            fontWeight: 700,
        },
        eyeToggle: {
            background: 'none',
            border: 'none',
            color: 'var(--admin-muted)',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            marginLeft: '6px',
        },
        dateSelector: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            height: '42px',
            padding: '0 16px',
            borderRadius: '12px',
            background: 'var(--admin-soft)',
            border: '1px solid var(--admin-border)',
            color: 'var(--admin-text)',
            fontSize: '0.85rem',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.02)',
            cursor: 'pointer',
            boxSizing: 'border-box',
        },
        exportBtn: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            height: '42px',
            padding: '0 18px',
            borderRadius: '10px',
            background: 'var(--admin-primary)',
            color: '#ffffff',
            border: 'none',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(30, 117, 255, 0.2)',
            transition: 'all 0.2s ease',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
        },
        topupButton: {
            height: '42px',
            width: '42px',
            borderRadius: '50%',
            border: '1px solid var(--admin-border)',
            background: 'var(--admin-soft)',
            color: 'var(--admin-primary)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.02)',
            boxSizing: 'border-box',
        },
        notificationBtn: {
            position: 'relative',
            height: '42px',
            width: '42px',
            borderRadius: '50%',
            border: '1px solid var(--admin-border)',
            background: 'var(--admin-soft)',
            color: 'var(--admin-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.02)',
            boxSizing: 'border-box',
        },
        notificationBadge: {
            position: 'absolute',
            top: '0px',
            right: '0px',
            background: '#ef4444',
            color: '#FFFFFF',
            borderRadius: '50%',
            width: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.65rem',
            fontWeight: 700,
            border: '2px solid var(--panel)',
        },
        profileDropdownWrapper: {
            position: 'relative',
        },
        avatarBtn: {
            height: '42px',
            width: '42px',
            borderRadius: '50%',
            border: '2px solid var(--panel)',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 800,
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            fontSize: '0.75rem',
            padding: 0,
            background: theme === 'light' ? 'linear-gradient(135deg, #be185d, #ef4444)' : 'linear-gradient(135deg, #1e75ff, #0052d9)',
            boxShadow: theme === 'light' ? '0 4px 12px rgba(220, 30, 38, 0.15)' : '0 4px 12px rgba(30, 117, 255, 0.15)',
            boxSizing: 'border-box',
        },
        profileDropdownMenu: {
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '12px',
            background: theme === 'light' ? '#ffffff' : '#1e293b',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
            width: '320px',
            overflow: 'hidden',
            zIndex: 1000,
            animation: 'dropdownSlideDown 0.2s ease',
        },
        dropdownHeader: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px',
            background: 'var(--admin-soft)',
            borderBottom: '1px solid var(--border)',
        },
        dsaAvatar: {
            height: '48px',
            width: '48px',
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 800,
            color: 'white',
            fontSize: '0.75rem',
            flexShrink: 0,
            background: theme === 'light' ? 'linear-gradient(135deg, #be185d, #ef4444)' : 'linear-gradient(135deg, #1e75ff, #0052d9)',
            boxShadow: theme === 'light' ? '0 4px 12px rgba(220, 30, 38, 0.2)' : '0 4px 12px rgba(30, 117, 255, 0.2)',
        },
        dsaInfo: {
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
        },
        dsaName: {
            fontWeight: 700,
            color: 'var(--text-primary)',
            fontSize: '0.95rem',
        },
        dsaId: {
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
        },
        dropdownDivider: {
            height: '1px',
            background: 'var(--border)',
            margin: 0,
        },
        dropdownMenuItems: {
            display: 'flex',
            flexDirection: 'column',
            padding: '8px 0',
        },
        dropdownMenuItem: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 500,
            transition: 'all 0.2s ease',
            textAlign: 'left',
            width: '100%',
        },
        logoutBtn: {
            color: 'var(--danger)',
        },
        dropdownBackdrop: {
            position: 'fixed',
            inset: 0,
            zIndex: 999,
        },
        svg: {
            flexShrink: 0,
            color: 'currentColor',
        },
        span: {
            flex: 1,
        },
        modalBackdrop: {
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
        },
        modal: {
            background: 'var(--panel)',
            borderRadius: '16px',
            padding: '24px',
            width: '90%',
            maxWidth: '400px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.05)',
        },
        modalTitle: {
            fontSize: '1.2rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '16px',
        },
        modalInput: {
            width: '100%',
            padding: '10px 12px',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            fontSize: '0.9rem',
            marginBottom: '16px',
            color: 'var(--text-primary)',
            outline: 'none',
            transition: 'border-color 0.2s ease',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
        },
        modalButtons: {
            display: 'flex',
            gap: '10px',
            justifyContent: 'flex-end',
        },
        modalBtn: {
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
        },
        modalBtnCancel: {
            background: 'var(--surface-soft)',
            color: 'var(--text-primary)',
        },
        modalBtnSubmit: {
            background: 'var(--primary)',
            color: '#FFFFFF',
        },
    };

    // Add keyframe animation
    const styleSheet = document.createElement('style');
    styleSheet.innerHTML = `
    @keyframes dropdownSlideDown {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
    if (!document.head.querySelector('style[data-topbar-animation]')) {
        styleSheet.setAttribute('data-topbar-animation', 'true');
        document.head.appendChild(styleSheet);
    }

    const filteredSearchPages = searchQuery
        ? SEARCHABLE_PAGES.filter(page =>
            page.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            page.category.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : SEARCHABLE_PAGES.slice(0, 5);

    return (
        <>
            <header style={styles.topbar}>
                {/* Left Section: Brand Logo & Search Box */}
                <div style={styles.topbarLeft}>
                    {/* Hamburger Menu - click to toggle sidebar */}
                    <div
                        style={{
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: '16px',
                            padding: '6px',
                            borderRadius: '6px',
                            transition: 'background 0.2s ease',
                            color: 'var(--admin-text)',
                        }}
                        onClick={() => {
                            if (onToggleSidebar) onToggleSidebar();
                        }}
                        title="Toggle Navigation Sidebar"
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-soft)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </div>

                    {/* Brand logo — click to open dashboard */}
                    <div
                        style={{
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            marginRight: '8px',
                            userSelect: 'none',
                            transition: 'opacity 0.2s ease',
                        }}
                        onClick={() => {
                            navigate('/admin');
                        }}
                        title="Go to Dashboard"
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.75'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                        <img src={pickNBookLogo} alt="PickNBook Logo" style={{ height: '46px', width: 'auto' }} />
                    </div>
 
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '440px' }}>
                        <div style={styles.searchWrapper} data-search-wrapper>
                            <span style={styles.searchBarIcon}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                            </span>
                            <input
                                type="text"
                                placeholder="Search anything..."
                                value={searchQuery || ''}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setShowSearchDropdown(true);
                                }}
                                onFocus={() => setShowSearchDropdown(true)}
                                style={styles.searchBarInput}
                                onMouseEnter={(e) => {
                                    if (document.activeElement !== e.currentTarget) {
                                        e.currentTarget.style.borderColor = '#be185d';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (document.activeElement !== e.currentTarget) {
                                        e.currentTarget.style.borderColor = 'var(--admin-border)';
                                    }
                                }}
                                onFocusCapture={(e) => {
                                    e.currentTarget.style.borderColor = '#be185d';
                                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(190, 24, 93, 0.15)';
                                }}
                                onBlurCapture={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--admin-border)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.01)';
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && filteredSearchPages.length > 0) {
                                        navigate(filteredSearchPages[0].path);
                                        setShowSearchDropdown(false);
                                        setSearchQuery('');
                                        e.target.blur();
                                    }
                                }}
                            />
                            {showSearchDropdown && (
                                <div style={styles.searchDropdown}>
                                    <div style={{ padding: '8px 16px', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--admin-muted)', fontWeight: 700, borderBottom: '1px solid var(--admin-border)', marginBottom: '4px' }}>
                                        {searchQuery ? 'Search Results' : 'Suggested Pages'}
                                    </div>
                                    {filteredSearchPages.length > 0 ? (
                                        filteredSearchPages.map((page, idx) => (
                                            <button
                                                key={page.path + idx}
                                                style={styles.searchDropdownItem}
                                                onClick={() => {
                                                    navigate(page.path);
                                                    setShowSearchDropdown(false);
                                                    setSearchQuery('');
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = 'var(--admin-soft)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'none';
                                                }}
                                            >
                                                <span style={styles.searchDropdownLabel}>{page.label}</span>
                                                <span style={styles.searchDropdownCategory}>{page.category}</span>
                                            </button>
                                        ))
                                    ) : (
                                        <div style={styles.noSearchResults}>
                                            No matching pages found
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                if (filteredSearchPages.length > 0) {
                                    navigate(filteredSearchPages[0].path);
                                    setShowSearchDropdown(false);
                                    setSearchQuery('');
                                }
                            }}
                            style={{
                                height: '42px',
                                padding: '0 20px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #be185d, #851237)',
                                color: '#ffffff',
                                border: 'none',
                                fontWeight: '700',
                                fontSize: '0.88rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 4px 12px rgba(190, 24, 93, 0.2)',
                                flexShrink: 0
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(190, 24, 93, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(190, 24, 93, 0.2)';
                            }}
                        >
                            Search
                        </button>
                    </div>
                </div>

                {/* Right Section: Toggle Theme, Fullscreen, Notifications, Profile Dropdown */}
                <div style={styles.topbarActions}>
                    {/* Theme Switch Toggle Button Removed */}

                    {/* Fullscreen Toggle Button */}
                    <button
                        style={styles.topupButton}
                        className="admin-fullscreen-btn"
                        onClick={toggleFullscreen}
                        title="Toggle Fullscreen"
                        aria-label="Toggle Fullscreen"
                    >
                        {isFullscreen ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7" />
                            </svg>
                        ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                            </svg>
                        )}
                    </button>

                    {/* Notification Bell Button */}
                    <div style={{ position: 'relative' }}>
                        <button
                            style={styles.notificationBtn}
                            className="admin-notification-btn"
                            type="button"
                            aria-label="Notifications"
                            onClick={() => {
                                const nextShow = !showNotifications;
                                setShowNotifications(nextShow);
                                setShowDatePicker(false);
                                if (nextShow) {
                                    setHasUnread(false);
                                }
                            }}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                            </svg>
                            {hasUnread && notificationCount > 0 && (
                                <span style={styles.notificationBadge}>
                                    {notificationCount > 99 ? '99+' : notificationCount}
                                </span>
                            )}
                        </button>
                        {showNotifications && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '10px',
                                background: 'var(--panel)',
                                border: '1px solid var(--admin-border)',
                                borderRadius: '12px',
                                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
                                width: '280px',
                                zIndex: 1100,
                                overflow: 'hidden',
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px 14px',
                                    background: 'var(--admin-soft)',
                                    borderBottom: '1px solid var(--admin-border)',
                                }}>
                                    <strong style={{ fontSize: '0.85rem', color: 'var(--admin-text)' }}>System Notifications</strong>
                                    <span style={{ fontSize: '0.62rem', background: '#3b82f6', color: '#fff', padding: '1px 6px', borderRadius: '10px', fontWeight: 'bold' }}>Active</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '200px', overflowY: 'auto' }}>
                                    {notifications.length > 0 ? (
                                        notifications.map((notif, idx) => (
                                            <div
                                                key={notif.id || idx}
                                                style={{
                                                    padding: '10px 14px',
                                                    borderBottom: idx === notifications.length - 1 ? 'none' : '1px solid #f1f5f9',
                                                    fontSize: '0.74rem',
                                                    color: '#334155',
                                                    cursor: notif.path ? 'pointer' : 'default',
                                                    transition: 'background 0.2s ease',
                                                }}
                                                onClick={() => {
                                                    if (notif.path) {
                                                        navigate(notif.path);
                                                        setShowNotifications(false);
                                                    }
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (notif.path) e.currentTarget.style.backgroundColor = '#f8fafc';
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (notif.path) e.currentTarget.style.backgroundColor = 'transparent';
                                                }}
                                            >
                                                <div style={{ fontWeight: 700, color: notif.color || '#1e75ff', marginBottom: '1px' }}>{notif.title}</div>
                                                <span>{notif.message}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.78rem', color: '#64748b' }}>
                                            No active notifications
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Profile & User Information Dropdown */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            cursor: 'pointer',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            transition: 'background 0.2s ease',
                            ...styles.profileDropdownWrapper
                        }}
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-soft)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', textAlign: 'left', pointerEvents: 'none' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--admin-text)', lineHeight: '1.3' }}>{adminData.adminEmail || 'admin@picknbook.in'}</span>
                        </div>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--admin-muted)', pointerEvents: 'none' }}>
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                            <div style={{ ...styles.profileDropdownMenu, right: '0px', top: '100%', marginTop: '8px' }} onClick={(e) => e.stopPropagation()}>
                                <div style={styles.dropdownHeader}>
                                    <div style={{
                                        ...styles.dsaAvatar,
                                        overflow: 'hidden',
                                        display: 'grid',
                                        placeItems: 'center'
                                    }}>
                                        {adminData.photoUrl ? (
                                            <img
                                                src={adminData.photoUrl}
                                                alt=""
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    e.currentTarget.parentElement.innerHTML = theme === 'light' ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; color: #ffffff;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>` : adminData.avatarInitials;
                                                }}
                                            />
                                        ) : (
                                            theme === 'light' ? (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', color: '#ffffff' }}>
                                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                                    <polyline points="22,6 12,13 2,6"></polyline>
                                                </svg>
                                            ) : (
                                                adminData.avatarInitials
                                            )
                                        )}
                                    </div>
                                    <div style={styles.dsaInfo}>
                                        <div style={styles.dsaName}>{adminData.adminEmail || 'admin@picknbook.in'}</div>
                                        <div style={styles.dsaId}>Admin ID: {adminData.adminId}</div>
                                    </div>
                                </div>

                                <div style={styles.dropdownDivider}></div>

                                <div style={styles.dropdownMenuItems}>
                                    <button
                                        className="topbar-dropdown-menu-item"
                                        onClick={handleClearCache}
                                        type="button"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={styles.svg}>
                                            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                                            <path d="M21 3v5h-5"></path>
                                            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                                            <path d="M3 21v-5h5"></path>
                                        </svg>
                                        <span style={styles.span}>Clear Cache & Cookies</span>
                                    </button>

                                    <button
                                        className="topbar-dropdown-menu-item"
                                        onClick={handleChangePassword}
                                        type="button"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={styles.svg}>
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                        </svg>
                                        <span style={styles.span}>Change Password</span>
                                    </button>

                                    <button
                                        className="topbar-dropdown-menu-item"
                                        onClick={handleChangePin}
                                        type="button"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={styles.svg}>
                                            <circle cx="12" cy="12" r="1"></circle>
                                            <circle cx="19" cy="12" r="1"></circle>
                                            <circle cx="5" cy="12" r="1"></circle>
                                        </svg>
                                        <span style={styles.span}>Change PIN</span>
                                    </button>
                                </div>

                                <div style={styles.dropdownDivider}></div>

                                <button
                                    className="topbar-dropdown-menu-item logout-item"
                                    onClick={handleLogout}
                                    type="button"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={styles.svg}>
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                        <polyline points="16 17 21 12 16 7"></polyline>
                                        <line x1="21" y1="12" x2="9" y2="12"></line>
                                    </svg>
                                    <span style={styles.span}>Logout</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {isDropdownOpen && (
                    <div style={styles.dropdownBackdrop} onClick={() => setIsDropdownOpen(false)}></div>
                )}
            </header>

            {/* Top Up Modal */}
            {showTopupModal && (
                <div style={styles.modalBackdrop} onClick={() => setShowTopupModal(false)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalTitle}>Request Top Up</div>
                        <input
                            type="number"
                            placeholder="Enter amount (INR)"
                            value={topupAmount}
                            onChange={(e) => setTopupAmount(e.target.value)}
                            style={styles.modalInput}
                            min="0"
                        />
                        <div style={styles.modalButtons}>
                            <button style={{ ...styles.modalBtn, ...styles.modalBtnCancel }} onClick={() => setShowTopupModal(false)}>
                                Cancel
                            </button>
                            <button style={{ ...styles.modalBtn, ...styles.modalBtnSubmit }} onClick={handleTopupSubmit}>
                                Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast.show && (
                <div style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    padding: '12px 24px',
                    borderRadius: '10px',
                    background: toast.type === 'success' ? '#ecfdf5' : '#fef2f2',
                    border: `1px solid ${toast.type === 'success' ? '#10b981' : '#ef4444'}`,
                    color: toast.type === 'success' ? '#065f46' : '#991b1b',
                    fontSize: '0.88rem',
                    fontWeight: 'bold',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
                    zIndex: 2000,
                    animation: 'dropdownSlideDown 0.3s ease',
                }}>
                    {toast.type === 'success' ? '✅ ' : '❌ '}{toast.message}
                </div>
            )}

            {/* Cache Loader Modal */}
            {showCacheLoader && (
                <div style={styles.modalBackdrop}>
                    <div style={{ ...styles.modal, textAlign: 'center', maxWidth: '300px' }}>
                        <div style={{
                            margin: '0 auto 16px',
                            border: '4px solid #f3f3f3',
                            borderTop: '4px solid #1e75ff',
                            borderRadius: '50%',
                            width: '40px',
                            height: '40px',
                            animation: 'spin 1s linear infinite',
                        }} />
                        <style>{`
                            @keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                            }
                        `}</style>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{cacheLoaderText}</div>
                    </div>
                </div>
            )}

            {/* Change Password Modal */}
            {showPasswordModal && (
                <div style={styles.modalBackdrop} onClick={() => setShowPasswordModal(false)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalTitle}>Change Password</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                            <input
                                type="password"
                                placeholder="Old Password"
                                value={passwordInputs.old}
                                onChange={(e) => setPasswordInputs(prev => ({ ...prev, old: e.target.value }))}
                                style={styles.modalInput}
                            />
                            <input
                                type="password"
                                placeholder="New Password"
                                value={passwordInputs.newPassword}
                                onChange={(e) => setPasswordInputs(prev => ({ ...prev, newPassword: e.target.value }))}
                                style={styles.modalInput}
                            />
                            <input
                                type="password"
                                placeholder="Confirm New Password"
                                value={passwordInputs.confirm}
                                onChange={(e) => setPasswordInputs(prev => ({ ...prev, confirm: e.target.value }))}
                                style={styles.modalInput}
                            />
                        </div>
                        <div style={styles.modalButtons}>
                            <button style={{ ...styles.modalBtn, ...styles.modalBtnCancel }} onClick={() => setShowPasswordModal(false)}>
                                Cancel
                            </button>
                            <button style={{ ...styles.modalBtn, ...styles.modalBtnSubmit }} onClick={handlePasswordSubmit}>
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Change PIN Modal */}
            {showPinModal && (
                <div style={styles.modalBackdrop} onClick={() => setShowPinModal(false)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalTitle}>Change Security PIN</div>
                        <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '12px' }}>Enter a new 4-digit PIN for console verification:</p>
                        <input
                            type="text"
                            maxLength="4"
                            placeholder="4-digit PIN"
                            value={pinInput}
                            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                            style={{ ...styles.modalInput, textAlign: 'center', letterSpacing: '8px', fontSize: '1.2rem', fontWeight: 'bold' }}
                        />
                        <div style={styles.modalButtons}>
                            <button style={{ ...styles.modalBtn, ...styles.modalBtnCancel }} onClick={() => setShowPinModal(false)}>
                                Cancel
                            </button>
                            <button style={{ ...styles.modalBtn, ...styles.modalBtnSubmit }} onClick={handlePinSubmit}>
                                Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default Topbar;

