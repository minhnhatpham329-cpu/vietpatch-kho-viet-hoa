/* ==========================================================================
   VietPatch Javascript - Single Page Application Core
   ========================================================================== */

const HOT_TRAILER_START_SECONDS = 6;
let weeklyTrailerItems = [];
let weeklyTrailerIndex = 0;
let weeklyTrailerPlayer = null;
let weeklyTrailerApiPromise = null;
let weeklyTrailerFailureCount = 0;
let weeklyTrailerMuted = true;
let weeklyTrailerMetadataTimer = null;

// 1. GAME CATALOGUE DATABASE
const gamesDatabase = [
    {
        id: "wukong",
        title: "Black Myth: Wukong",
        engine: "Unreal Engine 5",
        engineKey: "ue",
        developer: "Game Science",
        price: 0,
        size: "1.2 GB",
        version: "v1.0.4",
        type: "Free",
        progress: 100,
        appid: 2358720,
        downloads: "24.5k",
        date: "2026-06-15",
        desc: "Bản Việt hóa cho game hành động nhập vai dựa trên thần thoại Trung Hoa. Nội dung gồm hội thoại, thơ ca, thông tin Boss (Ảnh Thần Đồ) và giao diện; văn phong được hiệu đính theo sắc thái cổ điển của Tây Du Ký. Font chữ cũng được điều chỉnh để hiển thị đầy đủ tiếng Việt.",
        credits: {
            translator: "Đường Tăng, Ngộ Không, Bát Giới",
            editor: "Sa Tăng",
            technical: "Bạch Long Mã",
            qa: "Quan Âm Bồ Tát"
        },
        screenshots: [
            "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2358720/ss_75276c1236894c2d3cf38b1eb72851cf57fa4f67.600x338.jpg",
            "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2358720/ss_84bf9cb8e99427b37d45129994c65e8a5b2ab774.600x338.jpg"
        ],
        notes: "Patch Việt hóa yêu cầu game phiên bản Steam hoặc Epic Games Store chính thức. Khuyến cáo không cài đè lên các bản crack phiên bản cũ để tránh lỗi treo game."
    },
    {
        id: "eldenring",
        title: "Elden Ring: Shadow of the Erdtree",
        engine: "PhyreEngine (Custom)",
        engineKey: "other",
        developer: "FromSoftware",
        price: 0,
        size: "650 MB",
        version: "v1.12.2",
        type: "Free",
        progress: 100,
        appid: 1245620,
        downloads: "89.2k",
        date: "2026-06-20",
        desc: "Dự án Việt hóa lớn nhất của nhóm, bao gồm toàn bộ thế giới gốc của Elden Ring và bản mở rộng Shadow of the Erdtree. Hỗ trợ dịch chi tiết các mẩu đối thoại bí ẩn, mô tả hàng trăm trang bị, vũ khí, bùa chú giúp người chơi nắm rõ cốt truyện của Vùng Đất Bóng Tối (Land of Shadow). Hệ thống font chữ Việt hóa đồng bộ, sắc nét.",
        credits: {
            translator: "Miquella, Malenia, Radahn",
            editor: "Marika",
            technical: "Gideon Ofnir",
            qa: "Melina"
        },
        screenshots: [
            "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1245620/ss_1052697843818e69d0a6479f64a5c531d044cd93.600x338.jpg",
            "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1245620/ss_929f9df3564e9a3fa2784ef6d967b57b545d9cc0.600x338.jpg"
        ],
        notes: "Bản dịch chạy mượt mà và an toàn khi chơi Offline trên Steam. Tránh chơi chế độ Online có Easy Anti-Cheat (EAC) để bảo vệ tài khoản của bạn."
    },
    {
        id: "cyberpunk",
        title: "Cyberpunk 2077: Phantom Liberty",
        engine: "REDengine",
        engineKey: "other",
        developer: "CD Projekt RED",
        price: 90000,
        size: "950 MB",
        version: "v2.12",
        type: "Premium",
        progress: 100,
        appid: 1091500,
        downloads: "18.1k",
        date: "2026-05-10",
        desc: "Khám phá thành phố tương lai Night City và khu ổ chuột Dogtown bằng tiếng Việt hoàn chỉnh. Bản dịch lột tả chân thực phong cách đường phố, tiếng lóng, và cốt truyện đen tối, cân não của điệp viên liên bang. Việt hóa toàn bộ giao diện cấy ghép Cyberware, tin nhắn điện thoại cá nhân và cơ sở dữ liệu (Database).",
        credits: {
            translator: "Johnny Silverhand, V",
            editor: "Judy Alvarez",
            technical: "Viktor Vector",
            qa: "Panam Palmer"
        },
        screenshots: [
            "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/ss_91e921d7b322a309e4de77b1ebff954c2579dfd9.600x338.jpg",
            "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/ss_d4e3046fdf6d2c431525b6823ab063fb4e365022.600x338.jpg"
        ],
        notes: "Tương thích với phiên bản Next-Gen v2.0 trở lên trên Steam, GOG và Epic Games."
    },
    {
        id: "residentevil4",
        title: "Resident Evil 4 Remake",
        engine: "RE Engine",
        engineKey: "other",
        developer: "Capcom",
        price: 80000,
        size: "350 MB",
        version: "v1.0.6",
        type: "Premium",
        progress: 100,
        appid: 2050650,
        downloads: "14.3k",
        date: "2026-04-05",
        desc: "Hành trình nghẹt thở của Leon S. Kennedy đi tìm con gái Tổng thống tại ngôi làng tà giáo Tây Ban Nha. Bản Việt hóa dịch trọn vẹn phần chơi cốt truyện chính, DLC Separate Ways của Ada Wong, và chế độ Mercenaries. Chú trọng Việt hóa các tài liệu khoa học ẩn giấu để người chơi làm rõ nguồn gốc ký sinh trùng Plaga.",
        credits: {
            translator: "Leon Kennedy, Ada Wong",
            editor: "Luis Sera",
            technical: "Albert Wesker",
            qa: "Ashley Graham"
        },
        screenshots: [
            "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2050650/ss_593cf25595914fa6e811ddff70125712e1ff9e2c.600x338.jpg",
            "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2050650/ss_164b3ef86eb83d47d519b5bf46f7bd55d5d67784.600x338.jpg"
        ],
        notes: "Cài đặt dễ dàng thông qua phần mềm Fluffy Mod Manager. Hướng dẫn chi tiết đính kèm trong file tải."
    },
    {
        id: "liesofp",
        title: "Lies of P",
        engine: "Unreal Engine 4",
        engineKey: "ue",
        developer: "NEOWIZ",
        price: 0,
        size: "420 MB",
        version: "v1.4.0",
        type: "Free",
        progress: 100,
        appid: 1627720,
        downloads: "32.7k",
        date: "2026-06-01",
        desc: "Tựa game Soulslike đen tối kể về cậu bé rối gỗ Pinocchio tại thành phố điên loạn Krat. Việt hóa 100% hội thoại, các lựa chọn nói dối (Lying system) tác động đến kết cục game, cùng hệ thống nâng cấp trái tim P-Organ độc đáo. Bản patch tương thích tốt với Steam lẫn Xbox Game Pass PC.",
        credits: {
            translator: "Geppetto, Sophia",
            editor: "Pinocchio",
            technical: "Gemini",
            qa: "Simon Manus"
        },
        screenshots: [
            "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1627720/ss_4966606a07cfd1964d4ab2750e32db00c43924bf.600x338.jpg",
            "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1627720/ss_62858b29d108d169d2d09ffbf16ec6ddcb0865c3.600x338.jpg"
        ],
        notes: "Giải nén patch trực tiếp vào thư mục chứa file exe của Lies of P trên ổ đĩa."
    },
    {
        id: "hogwarts",
        title: "Hogwarts Legacy",
        engine: "Unreal Engine 4",
        engineKey: "ue",
        developer: "Avalanche Software",
        price: 0,
        size: "820 MB",
        version: "v1.1.2",
        type: "Free",
        progress: 100,
        appid: 990080,
        downloads: "54.8k",
        date: "2026-03-25",
        desc: "Bản Việt hóa nội dung tại Hogwarts thế kỷ 19, gồm lớp học bùa chú, công thức độc dược, mô tả sinh vật, nhiệm vụ phụ và giao diện. Phông chữ được điều chỉnh theo phong cách học đường ma thuật của game.",
        credits: {
            translator: "Harry Potter, Hermione",
            editor: "Dumbledore",
            technical: "Professor Fig",
            qa: "Ron Weasley"
        },
        screenshots: [
            "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/990080/ss_cc19582d9213b1f964096055d7f1c1f7236d8d64.600x338.jpg",
            "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/990080/ss_f5c531d044cd93929f9df3564e9a3fa2784ef6d9.600x338.jpg"
        ],
        notes: "Chép đè thư mục Content vào thư mục cài đặt game của Steam để cài đặt."
    },
    {
        id: "stray",
        title: "Stray",
        engine: "Unreal Engine 4",
        engineKey: "ue",
        developer: "BlueTwelve Studio",
        price: 0,
        size: "120 MB",
        version: "v1.0.3",
        type: "Free",
        progress: 100,
        appid: 1332010,
        downloads: "61.2k",
        date: "2026-02-15",
        desc: "Cuộc phiêu lưu của chú mèo cam đi lạc trong một thế giới robot đầy cảm xúc. Dịch nghĩa dí dỏm, mượt mà giúp người chơi hiểu sâu hơn về ký ức của robot đồng hành B-12 và tâm tư của những robot 'ngoại hạng' (Outsiders) mong mỏi tìm đường lên mặt đất.",
        credits: {
            translator: "B-12, Chú Mèo Cam",
            editor: "Clementine",
            technical: "Momo",
            qa: "Doc"
        },
        screenshots: [
            "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1332010/ss_c394c8e76c1236894c2d3cf38b1eb72851cf57fa.600x338.jpg",
            "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1332010/ss_84bf9cb8e99427b37d45129994c65e8a5b2ab774.600x338.jpg"
        ],
        notes: "Cài bằng cách chép file PAK Việt hóa vào thư mục Content/Paks/~mods."
    },
    {
        id: "witcher3",
        title: "The Witcher 3: Wild Hunt (Next-Gen)",
        engine: "REDengine 3",
        engineKey: "other",
        developer: "CD Projekt RED",
        price: 0,
        size: "780 MB",
        version: "v4.04",
        type: "Free",
        progress: 100,
        appid: 292030,
        downloads: "95.1k",
        date: "2026-06-25",
        desc: "Bản Việt hóa cuộc phiêu lưu của Geralt xứ Rivia dành cho nhánh Next-Gen. Nội dung gồm game gốc, hai DLC Hearts of Stone và Blood and Wine, luật chơi Gwent, hội thoại và giao diện.",
        credits: {
            translator: "Geralt, Yennefer",
            editor: "Triss Merigold",
            technical: "Dandelion",
            qa: "Ciri"
        },
        screenshots: [
            "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/292030/ss_07cfd1964d4ab2750e32db00c43924bf62858b29.600x338.jpg",
            "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/292030/ss_a5c531d044cd93929f9df3564e9a3fa2784ef6d9.600x338.jpg"
        ],
        notes: "Hỗ trợ đầy đủ cho phiên bản Next-Gen DX12 lẫn phiên bản Classic cũ DX11."
    },
    {
        id: "baldursgate3",
        title: "Baldur's Gate 3",
        engine: "Larian Divinity Engine 4.0",
        engineKey: "other",
        developer: "Larian Studios",
        price: 120000,
        size: "2.1 GB",
        version: "v4.1.1",
        type: "Premium",
        progress: 100,
        appid: 1086940,
        downloads: "29.7k",
        date: "2026-06-10",
        desc: "Dự án có hơn 2 triệu chữ, bao gồm tình huống đổ xúc sắc theo luật D&D, hội thoại giữa các chủng tộc, sách về Faerûn và giao diện tạo nhân vật. Phần lời thoại được hiệu đính theo hồ sơ của từng nhân vật đồng hành.",
        credits: {
            translator: "Shadowheart, Astarion, Gale",
            editor: "Karlach",
            technical: "Wyll",
            qa: "Lae'zel"
        },
        screenshots: [
            "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1086940/ss_84bf9cb8e99427b37d45129994c65e8a5b2ab774.600x338.jpg",
            "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1086940/ss_1052697843818e69d0a6479f64a5c531d044cd93.600x338.jpg"
        ],
        notes: "Tải patch và cài đặt qua mod manager hoặc copy trực tiếp vào thư mục Data để thưởng thức."
    },
    {
        id: "subnautica",
        title: "Subnautica",
        engine: "Unity",
        engineKey: "unity",
        developer: "Unknown Worlds",
        price: 0,
        size: "80 MB",
        version: "v2.0.4",
        type: "Free",
        progress: 100,
        appid: 264710,
        downloads: "42.5k",
        date: "2026-03-01",
        desc: "Bản dịch Việt hóa cho trò chơi sinh tồn dưới đại dương vô tận. Toàn bộ cơ sở dữ liệu PDA về các sinh vật biển, quái vật Leviathan, nhật ký nghiên cứu khoa học của người tiền nhiệm và giao diện chế tạo trang bị công nghệ cao đều được dịch sang tiếng Việt mượt mà.",
        credits: {
            translator: "Ryley Robinson",
            editor: "Al-An",
            technical: "Marguerit",
            qa: "Robin"
        },
        screenshots: [
            "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/264710/ss_cc19582d9213b1f964096055d7f1c1f7236d8d64.600x338.jpg",
            "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/264710/ss_f5c531d044cd93929f9df3564e9a3fa2784ef6d9.600x338.jpg"
        ],
        notes: "Bản dịch chạy mượt mà trên cả Steam và Epic Games, hỗ trợ điều khiển bằng gamepad."
    },
    {
        id: "rust",
        title: "Rust",
        engine: "Unity",
        engineKey: "unity",
        developer: "Facepunch Studios",
        price: 0,
        size: "150 MB",
        version: "v1.2.9",
        type: "Free",
        progress: 100,
        appid: 252490,
        downloads: "31.8k",
        date: "2026-02-28",
        desc: "Dịch thuật toàn bộ giao diện sinh tồn, chế tạo súng, xây nhà, nâng cấp tháp bảo vệ của tựa game multiplayer nổi tiếng. Cung cấp patch việt hóa tối ưu hóa hiển thị, tránh ảnh hưởng đến tốc độ khung hình (FPS) khi tham gia các server PVP căng thẳng.",
        credits: {
            translator: "Garry Newman",
            editor: "Rust Member",
            technical: "Helk",
            qa: "Facepunch Team"
        },
        screenshots: [
            "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/252490/ss_84bf9cb8e99427b37d45129994c65e8a5b2ab774.600x338.jpg",
            "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/252490/ss_929f9df3564e9a3fa2784ef6d967b57b545d9cc0.600x338.jpg"
        ],
        notes: "Sử dụng chế độ Việt hóa giao diện chuẩn, an toàn trên tất cả các server cộng đồng và server chính thức."
    },
    {
        id: "sekiro",
        title: "Sekiro: Shadows Die Twice",
        engine: "PhyreEngine (Custom)",
        engineKey: "other",
        developer: "FromSoftware",
        price: 0,
        size: "180 MB",
        version: "v1.06",
        type: "Free",
        progress: 100,
        appid: 814380,
        downloads: "68.4k",
        date: "2026-05-20",
        desc: "Bản dịch cuộc phiêu lưu của 'Sói một tay' (Shinobi Wolf) trong thời kỳ Sengoku Nhật Bản. Nội dung gồm lời thoại mang nhiều ẩn dụ, kỹ năng Combat Arts, công cụ Prosthetic Tools và ghi chú về các boss thần thoại.",
        credits: {
            translator: "Sekiro, Kuro",
            editor: "Emma",
            technical: "Isshin Ashina",
            qa: "Genichiro Ashina"
        },
        screenshots: [
            "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/814380/ss_4966606a07cfd1964d4ab2750e32db00c43924bf.600x338.jpg",
            "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/814380/ss_164b3ef86eb83d47d519b5bf46f7bd55d5d67784.600x338.jpg"
        ],
        notes: "Cài đặt đơn giản thông qua Sekiro Mod Engine. Hỗ trợ đầy đủ tiếng Nhật gốc đi kèm phụ đề Việt ngữ chuẩn."
    },
    {
        id: "rdr2",
        title: "Red Dead Redemption 2",
        engine: "RAGE",
        engineKey: "other",
        developer: "Rockstar Games",
        price: 100000,
        size: "1.8 GB",
        version: "v1.0.1491",
        type: "Premium",
        progress: 100,
        appid: 1174180,
        downloads: "35.4k",
        date: "2026-06-05",
        desc: "Bản Việt hóa câu chuyện về sự suy tàn của băng Van der Linde. Phạm vi gồm hội thoại của Arthur Morgan và các thành viên, sổ tay phác họa, báo chí miền Tây, danh mục mua sắm và giao diện tương tác NPC.",
        credits: {
            translator: "Arthur Morgan, John Marston",
            editor: "Dutch van der Linde",
            technical: "Hosea Matthews",
            qa: "Sadie Adler"
        },
        screenshots: [
            "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1174180/ss_91e921d7b322a309e4de77b1ebff954c2579dfd9.600x338.jpg",
            "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1174180/ss_1052697843818e69d0a6479f64a5c531d044cd93.600x338.jpg"
        ],
        notes: "Yêu cầu máy tính cài đặt LML (Lenny's Mod Loader) để nạp tài nguyên Việt hóa."
    },
    {
        id: "ghost",
        title: "Ghost of Tsushima: Director's Cut",
        engine: "Sucker Punch Engine",
        engineKey: "other",
        developer: "Sucker Punch Productions",
        price: 110000,
        size: "920 MB",
        version: "v1.0.5",
        type: "Premium",
        progress: 100,
        appid: 2215430,
        downloads: "27.8k",
        date: "2026-06-18",
        desc: "Cuộc chiến bảo vệ đảo Tsushima của samurai Jin Sakai chống lại đế quốc Mông Cổ. Việt hóa trọn vẹn phần chơi cốt truyện chính, DLC Đảo Iki và chế độ Multiplayer Co-op Legends. Dịch nghĩa sát văn phong Samurai cổ Nhật Bản, các bài thơ Haiku và hội thoại dẫn dắt cốt truyện đầy bi tráng.",
        credits: {
            translator: "Jin Sakai, Lord Shimura",
            editor: "Yuna",
            technical: "Taka",
            qa: "Masako"
        },
        screenshots: [
            "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2215430/ss_d4e3046fdf6d2c431525b6823ab063fb4e365022.600x338.jpg",
            "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2215430/ss_84bf9cb8e99427b37d45129994c65e8a5b2ab774.600x338.jpg"
        ],
        notes: "Hỗ trợ nạp trực tiếp qua file đóng gói, hoạt động ổn định ở chế độ Offline lẫn chế độ chơi mạng Co-op."
    }
];

// 2. IN PROGRESS TRANSLATIONS
const progressProjects = [
    {
        id: "gtavi",
        title: "Grand Theft Auto VI",
        engine: "RAGE",
        developer: "Rockstar Games",
        appid: 271590, // mock with GTA V ID
        releaseDate: "Dự kiến: Cuối năm 2026",
        overallProgress: 15,
        breakdown: {
            translate: 25,
            proofread: 5,
            edit: 0,
            test: 0
        }
    },
    {
        id: "silenthill2",
        title: "Silent Hill 2 Remake",
        engine: "Unreal Engine 5",
        developer: "Bloober Team / Konami",
        appid: 2124490,
        releaseDate: "Dự kiến: Tháng sau",
        overallProgress: 75,
        breakdown: {
            translate: 90,
            proofread: 80,
            edit: 70,
            test: 60
        }
    },
    {
        id: "monsterhunter",
        title: "Monster Hunter: Wilds",
        engine: "RE Engine",
        developer: "Capcom",
        appid: 2246340,
        releaseDate: "Dự kiến: Quý 3 2026",
        overallProgress: 40,
        breakdown: {
            translate: 55,
            proofread: 40,
            edit: 30,
            test: 15
        }
    },
    {
        id: "hades2",
        title: "Hades II",
        engine: "Custom Engine",
        developer: "Supergiant Games",
        appid: 1145350,
        releaseDate: "Dự kiến: Tháng sau",
        overallProgress: 82,
        breakdown: {
            translate: 95,
            proofread: 85,
            edit: 80,
            test: 70
        }
    }
];

// 3. INITIAL COMMUNITY REQUESTS
const initialRequests = [
    {
        id: "request-dragons-dogma-2",
        title: "Dragon's Dogma 2",
        logoUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2054970/header.jpg",
        engine: "RE Engine",
        platform: "Steam",
        link: "https://store.steampowered.com/app/2054970/Dragons_Dogma_2/",
        notes: "Game cốt truyện sâu sắc, lời thoại phong cách cổ trang Anh ngữ khá phức tạp, cần được dịch ngữ Việt để tăng trải nghiệm.",
        votes: 1845,
        voted: false
    },
    {
        id: "request-alan-wake-2",
        title: "Alan Wake 2",
        logoUrl: "",
        engine: "Northlight",
        platform: "Epic Games",
        link: "https://store.epicgames.com/vi/p/alan-wake-2",
        notes: "Game kinh dị tâm lý của Remedy có nhiều tài liệu điều tra và đoạn văn phân lớp cần thống nhất thuật ngữ.",
        votes: 1532,
        voted: false
    },
    {
        id: "request-dead-space-remake",
        title: "Dead Space Remake",
        logoUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1693980/header.jpg",
        engine: "Frostbite",
        platform: "Steam",
        link: "https://store.steampowered.com/app/1693980/Dead_Space/",
        notes: "Muốn trải nghiệm cảm giác kinh dị ngoài vũ trụ một cách trọn vẹn hơn. Việt hóa sẽ giúp hiểu rõ nguồn gốc Marker.",
        votes: 945,
        voted: false
    },
    {
        id: "request-sifu",
        title: "Sifu",
        logoUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2138710/header.jpg",
        engine: "Unreal Engine 4",
        platform: "Steam",
        link: "https://store.steampowered.com/app/2138710/Sifu/",
        notes: "Đề xuất Việt hóa giao diện bảng kỹ năng, thuật ngữ võ thuật và các đoạn hội thoại.",
        votes: 720,
        voted: false
    }
];

// 4. SPA STATE VARIABLES
let activeTab = "home";
let searchQuery = "";
let currentFilter = "all";
let currentAvailability = "all";
let currentSort = "newest";
let currentCatalogPage = 1;
let activeHeroSlide = 0;
let heroRotationInterval = null;
let detailReturnFocus = null;
let accountServiceAvailable = null;
let authSecurityConfig = {
    googleEnabled: false,
    turnstile: { enabled: false, siteKey: "" }
};
let turnstileScriptPromise = null;
const turnstileWidgets = { login: null, register: null };
const turnstileTokens = { login: "", register: "" };

// User Profile System (server-backed, sensitive state stays in memory only)
let userState = {
    loggedIn: false,
    username: "Khách",
    email: "",
    balance: 0,
    ownedGames: [],
    joinedAt: new Date().toISOString(),
    transactionHistory: []
};

let requestsList = [...initialRequests];
let requestQuery = "";
let cmsState = null;
let hiddenGameIds = new Set();

async function initializeCmsContent() {
    const CMS = window.VietPatchCMS;
    if (!CMS) return;

    cmsState = await CMS.loadRemote();
    hiddenGameIds = new Set(Array.isArray(cmsState.hiddenGameIds) ? cmsState.hiddenGameIds : []);
    applyCmsCustomGames(cmsState.customGames);
    applyCmsGameOverrides(cmsState.gameOverrides);
    renderCmsHomeContent();
}

function getPublicGames() {
    return gamesDatabase.filter(game => !hiddenGameIds.has(game.id));
}

function normalizeSearchText(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .trim();
}

function parseDownloadCount(value) {
    const source = String(value || "0").trim().toLowerCase().replace(/,/g, ".");
    const amount = Number.parseFloat(source.replace(/[^0-9.]/g, "")) || 0;
    if (source.includes("m")) return amount * 1_000_000;
    if (source.includes("k")) return amount * 1_000;
    return amount;
}

function getGameReleaseState(game) {
    const progress = Math.max(0, Math.min(100, Number(game?.progress) || 0));
    const downloadUrl = window.VietPatchCMS?.safeUrl(game?.downloadUrl) || "";

    if (progress < 100) {
        return {
            key: "in-progress",
            label: `Đang thực hiện ${progress}%`,
            shortLabel: `${progress}%`,
            icon: "fa-bars-progress",
            actionable: false,
            hasDownload: false
        };
    }

    if (!downloadUrl) {
        return {
            key: "preparing",
            label: "Đang chuẩn bị file tải",
            shortLabel: "Chờ file",
            icon: "fa-clock",
            actionable: false,
            hasDownload: false
        };
    }

    return {
        key: "ready",
        label: "Sẵn sàng cài đặt",
        shortLabel: "Sẵn sàng",
        icon: "fa-circle-check",
        actionable: true,
        hasDownload: true
    };
}

function formatGameDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Chưa rõ";
    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(date);
}

function updateCatalogSummary(filteredGames = getPublicGames()) {
    const publicGames = getPublicGames();
    const readyGames = publicGames.filter(game => Number(game.progress) >= 100);
    const inProgressGames = publicGames.filter(game => Number(game.progress) < 100);
    const freeGames = publicGames.filter(game => Number(game.price) === 0);
    const engineGroups = new Set(publicGames.map(game => game.engineKey || game.engine).filter(Boolean));
    const values = {
        "stat-total-games": publicGames.length,
        "stat-ready-games": readyGames.length,
        "stat-free-games": freeGames.length,
        "stat-active-projects": progressProjects.length,
        "catalog-result-count": filteredGames.length,
        "overview-total-count": publicGames.length,
        "overview-ready-count": readyGames.length,
        "overview-progress-count": inProgressGames.length,
        "overview-engine-count": engineGroups.size
    };

    Object.entries(values).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = String(value);
    });

    const stateLine = document.getElementById("catalog-state-line");
    if (!stateLine) return;

    const labels = [];
    if (searchQuery) labels.push(`Từ khóa: “${searchQuery}”`);
    if (currentFilter !== "all") {
        labels.push(`Engine: ${{ ue: "Unreal", unity: "Unity", other: "Khác" }[currentFilter] || currentFilter}`);
    }
    if (currentAvailability !== "all") {
        labels.push(`Trạng thái: ${{ ready: "Đã hoàn thành", "in-progress": "Đang thực hiện" }[currentAvailability] || currentAvailability}`);
    }

    stateLine.hidden = labels.length === 0;
    stateLine.innerHTML = labels.length
        ? `<i class="fa-solid fa-filter"></i><span>${labels.map(escapeHtml).join(" · ")}</span>`
        : "";
}

function syncCatalogControls() {
    document.querySelectorAll("#engine-filters .filter-btn").forEach(button => {
        button.classList.toggle("active", button.dataset.filter === currentFilter);
    });

    const availabilitySelect = document.getElementById("availability-filter");
    const sortSelect = document.getElementById("sort-select");
    const globalSearch = document.getElementById("global-search");
    const heroSearch = document.getElementById("hero-search");
    if (availabilitySelect) availabilitySelect.value = currentAvailability;
    if (sortSelect) sortSelect.value = currentSort;
    if (globalSearch && globalSearch.value !== searchQuery) globalSearch.value = searchQuery;
    if (heroSearch && heroSearch.value !== searchQuery) heroSearch.value = searchQuery;
}

function resetCatalogFilters() {
    searchQuery = "";
    currentFilter = "all";
    currentAvailability = "all";
    currentSort = "newest";
    currentCatalogPage = 1;
    syncCatalogControls();
    renderGamesGrid();
}

function revealCatalog({ smooth = true } = {}) {
    if (activeTab !== "home") switchTab("home");
    requestAnimationFrame(() => {
        document.getElementById("catalog")?.scrollIntoView({
            behavior: smooth ? "smooth" : "auto",
            block: "start"
        });
    });
}

function applyCmsCustomGames(customGames) {
    if (!Array.isArray(customGames)) return;

    customGames.forEach(entry => {
        if (!entry?.id || gamesDatabase.some(game => game.id === entry.id)) return;
        const type = entry.type || "Free";
        const price = type.toLocaleLowerCase("en") === "free"
            ? 0
            : (entry.price === "" || entry.price == null ? 0 : Math.max(0, Number(entry.price) || 0));

        gamesDatabase.push({
            id: entry.id,
            title: entry.title,
            engine: entry.engine || "Unreal Engine 5",
            engineKey: entry.engineKey || "other",
            developer: entry.developer || "Community Studio",
            price,
            size: entry.size || "Đang cập nhật",
            version: entry.version || "v1.0.0",
            type,
            progress: entry.progress === "" || entry.progress == null ? 100 : Math.max(0, Math.min(100, Number(entry.progress) || 0)),
            appid: entry.appid || "",
            downloads: entry.downloads || "0",
            date: entry.date || new Date().toISOString().slice(0, 10),
            desc: entry.description || "Bản patch cộng đồng mới được thêm từ VietPatch Content Studio.",
            credits: {
                translator: entry.credits?.translator || "VietPatch Community",
                editor: entry.credits?.editor || "Content Studio",
                technical: entry.credits?.technical || "Patchroom",
                qa: entry.credits?.qa || "QA Board"
            },
            screenshots: Array.isArray(entry.screenshots) && entry.screenshots.length
                ? entry.screenshots
                : (entry.imageUrl ? [entry.imageUrl] : []),
            notes: entry.notes || "Thông tin cài đặt sẽ được cập nhật trong hồ sơ patch.",
            downloadUrl: entry.downloadUrl || "",
            imageUrl: entry.imageUrl || "",
            badge: entry.badge || "",
            tags: Array.isArray(entry.tags) ? entry.tags : []
        });
    });
}

function applyCmsGameOverrides(overrides) {
    if (!overrides || typeof overrides !== "object") return;

    gamesDatabase.forEach(game => {
        const entry = overrides[game.id];
        if (!entry) return;

        if (entry.title) game.title = entry.title;
        if (entry.engine) game.engine = entry.engine;
        if (entry.engineKey) game.engineKey = entry.engineKey;
        if (entry.developer) game.developer = entry.developer;
        if (entry.version) game.version = entry.version;
        if (entry.size) game.size = entry.size;
        if (entry.type) game.type = entry.type;
        if (game.type.toLocaleLowerCase("en") === "free") {
            game.price = 0;
        } else if (entry.price !== "" && entry.price != null) {
            game.price = Math.max(0, Number(entry.price) || 0);
        }
        if (entry.progress !== "" && entry.progress != null) game.progress = Math.max(0, Math.min(100, Number(entry.progress) || 0));
        if (entry.downloads) game.downloads = entry.downloads;
        if (entry.date) game.date = entry.date;
        if (entry.description) game.desc = entry.description;
        if (entry.notes) game.notes = entry.notes;
        if (entry.imageUrl) {
            game.imageUrl = entry.imageUrl;
            game.screenshots = [entry.imageUrl, ...(game.screenshots || [])].slice(0, 4);
        }
        if (Array.isArray(entry.screenshots) && entry.screenshots.length) {
            game.screenshots = entry.screenshots;
        }
        if (entry.credits && typeof entry.credits === "object") {
            game.credits = {
                ...(game.credits || {}),
                ...Object.fromEntries(Object.entries(entry.credits).filter(([, value]) => value))
            };
        }
        if (Array.isArray(entry.tags)) game.tags = entry.tags;
        if (Object.prototype.hasOwnProperty.call(entry, "badge")) game.badge = entry.badge || "";
        if (Object.prototype.hasOwnProperty.call(entry, "downloadUrl")) {
            game.downloadUrl = entry.downloadUrl || "";
        }
    });
}

function renderCmsHomeContent() {
    if (!cmsState) return;

    const site = cmsState.site || {};
    const setText = (selector, value) => {
        const element = document.querySelector(selector);
        if (element && value) element.textContent = value;
    };

    setText(".cms-newsroom-kicker", site.newsroomKicker);
    setText("#cms-newsroom-title", site.newsroomHeading);
    setText(".cms-newsroom-intro", site.newsroomIntro);
    setText(".patch-desk-kicker", site.patchDeskKicker);
    setText("#patch-desk-title", site.patchDeskHeading);
    setText(".patch-desk-header p", site.patchDeskIntro);
    setText("#catalog-heading", site.catalogHeading);
    setText("#catalog-intro", site.catalogIntro);

    renderWeeklyTrailer();
    renderCmsPosts();
}

function getCurrentIsoWeek(date = new Date()) {
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = utcDate.getUTCDay() || 7;
    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
    const weekYear = utcDate.getUTCFullYear();
    const yearStart = new Date(Date.UTC(weekYear, 0, 1));
    const week = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
    return { week, year: weekYear };
}

function renderWeeklyTrailer() {
    const section = document.querySelector(".weekly-trailer");
    const media = document.getElementById("weekly-trailer-media");
    const player = document.getElementById("weekly-trailer-player");
    const poster = document.getElementById("weekly-trailer-poster");
    const playButton = document.getElementById("weekly-trailer-play");
    const controls = document.getElementById("weekly-trailer-controls");
    const period = document.getElementById("weekly-trailer-period");
    const category = document.getElementById("weekly-trailer-category");
    const title = document.getElementById("weekly-trailer-title");
    const description = document.getElementById("weekly-trailer-description");
    const externalLink = document.getElementById("weekly-trailer-link");
    if (!section || !media || !player || !cmsState) return;

    const { week, year } = getCurrentIsoWeek();
    const weekLabel = String(week).padStart(2, "0");
    if (period) {
        period.dateTime = `${year}-W${weekLabel}`;
        period.textContent = `Tuần ${weekLabel} · ${year}`;
    }

    weeklyTrailerItems = Array.isArray(cmsState.trailers)
        ? cmsState.trailers.filter(item => item.enabled && /^[A-Za-z0-9_-]{6,20}$/.test(String(item.videoId || "").trim()))
        : [];
    const trailer = weeklyTrailerItems[0] || null;

    if (!trailer) {
        section.classList.add("is-empty");
        stopWeeklyTrailerMetadataTracking();
        weeklyTrailerPlayer?.stopVideo?.();
        player.hidden = true;
        if (!weeklyTrailerPlayer) player.removeAttribute("src");
        delete media.dataset.videoId;
        if (poster) poster.hidden = true;
        if (playButton) playButton.hidden = true;
        if (controls) controls.hidden = true;
        if (category) category.textContent = "CHƯA CÓ VIDEO";
        if (title) title.textContent = "Chưa chọn trailer tuần";
        if (description) description.textContent = "Bật một trailer trong trang quản trị để đưa lên trang chủ.";
        if (externalLink) externalLink.hidden = true;
        return;
    }

    section.classList.remove("is-empty");
    if (controls) controls.hidden = window.location.protocol === "file:";
    weeklyTrailerIndex = 0;
    weeklyTrailerFailureCount = 0;
    renderWeeklyTrailerItem(weeklyTrailerIndex);

    if (window.location.protocol === "file:") {
        player.hidden = true;
        if (!weeklyTrailerPlayer) player.removeAttribute("src");
        if (poster) poster.hidden = false;
        if (playButton) playButton.hidden = false;
        return;
    }

    startWeeklyTrailerPlayback(weeklyTrailerIndex);
}

function renderWeeklyTrailerItem(index) {
    const media = document.getElementById("weekly-trailer-media");
    const player = document.getElementById("weekly-trailer-player");
    const poster = document.getElementById("weekly-trailer-poster");
    const playButton = document.getElementById("weekly-trailer-play");
    const category = document.getElementById("weekly-trailer-category");
    const title = document.getElementById("weekly-trailer-title");
    const description = document.getElementById("weekly-trailer-description");
    const externalLink = document.getElementById("weekly-trailer-link");
    const caption = document.querySelector(".weekly-trailer-caption");
    const trailer = weeklyTrailerItems[index];
    if (!trailer || !media || !player) return;

    const videoId = String(trailer.videoId).trim();
    media.dataset.videoId = videoId;
    player.title = `${trailer.title || "Trailer tuần"} - Trailer`;
    if (poster) {
        poster.src = `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
        poster.alt = `Ảnh xem trước trailer ${trailer.title || "tuần này"}`;
    }
    if (playButton) playButton.setAttribute("aria-label", `Phát trailer ${trailer.title || "tuần này"}`);
    if (category) category.textContent = trailer.category || "TRAILER CHÍNH THỨC";
    if (title) title.textContent = trailer.title || "Trailer tuần";
    if (description) {
        description.textContent = trailer.description
            || "Trailer chính thức được ban biên tập chọn cho tuần này.";
    }
    if (externalLink) {
        externalLink.hidden = false;
        externalLink.href = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
        externalLink.setAttribute("aria-label", `Mở trailer ${trailer.title || "tuần này"} trên YouTube`);
    }
    if (caption) {
        caption.classList.remove("is-copy-entering");
        void caption.offsetWidth;
        caption.classList.add("is-copy-entering");
    }
}

function syncWeeklyTrailerSound() {
    const button = document.getElementById("weekly-trailer-sound");
    const icon = button?.querySelector("i");
    const label = button?.querySelector("span");

    if (button) {
        button.classList.toggle("is-muted", weeklyTrailerMuted);
        button.setAttribute("aria-pressed", String(!weeklyTrailerMuted));
        button.setAttribute("aria-label", weeklyTrailerMuted ? "Bật tiếng trailer" : "Tắt tiếng trailer");
    }
    if (icon) icon.className = `fa-solid ${weeklyTrailerMuted ? "fa-volume-xmark" : "fa-volume-high"}`;
    if (label) label.textContent = weeklyTrailerMuted ? "Bật tiếng" : "Tắt tiếng";

    if (weeklyTrailerPlayer) {
        if (weeklyTrailerMuted) {
            weeklyTrailerPlayer.mute?.();
        } else {
            weeklyTrailerPlayer.unMute?.();
            weeklyTrailerPlayer.setVolume?.(75);
            weeklyTrailerPlayer.playVideo?.();
        }
        return;
    }

    const frame = document.getElementById("weekly-trailer-player");
    if (!frame?.contentWindow) return;
    const send = (func, args = []) => frame.contentWindow.postMessage(JSON.stringify({
        event: "command",
        func,
        args
    }), "https://www.youtube-nocookie.com");
    send(weeklyTrailerMuted ? "mute" : "unMute");
    if (!weeklyTrailerMuted) send("setVolume", [75]);
}

function syncWeeklyTrailerMetadataFromPlayer(player = weeklyTrailerPlayer) {
    if (!player?.getVideoData) return;
    if (window.YT?.PlayerState && player.getPlayerState?.() !== window.YT.PlayerState.PLAYING) return;

    const videoId = String(player.getVideoData()?.video_id || "").trim();
    if (!videoId) return;
    const nextIndex = weeklyTrailerItems.findIndex(item => String(item.videoId).trim() === videoId);
    if (nextIndex < 0 || nextIndex === weeklyTrailerIndex) return;

    weeklyTrailerIndex = nextIndex;
    renderWeeklyTrailerItem(nextIndex);
}

function startWeeklyTrailerMetadataTracking() {
    stopWeeklyTrailerMetadataTracking();
    weeklyTrailerMetadataTimer = window.setInterval(() => {
        syncWeeklyTrailerMetadataFromPlayer();
    }, 650);
}

function stopWeeklyTrailerMetadataTracking() {
    if (!weeklyTrailerMetadataTimer) return;
    window.clearInterval(weeklyTrailerMetadataTimer);
    weeklyTrailerMetadataTimer = null;
}

function startWeeklyTrailerPlayback(index = weeklyTrailerIndex) {
    const trailer = weeklyTrailerItems[index];
    const playerFrame = document.getElementById("weekly-trailer-player");
    const poster = document.getElementById("weekly-trailer-poster");
    const playButton = document.getElementById("weekly-trailer-play");
    if (!trailer || !playerFrame || window.location.protocol === "file:") return;

    weeklyTrailerIndex = index;
    renderWeeklyTrailerItem(index);
    const videoId = String(trailer.videoId).trim();
    playerFrame.hidden = false;
    if (poster) poster.hidden = true;
    if (playButton) playButton.hidden = true;

    if (weeklyTrailerPlayer?.loadVideoById) {
        weeklyTrailerPlayer.loadVideoById({ videoId, startSeconds: HOT_TRAILER_START_SECONDS });
        window.setTimeout(syncWeeklyTrailerSound, 120);
        startWeeklyTrailerMetadataTracking();
        return;
    }

    const origin = encodeURIComponent(window.location.origin);
    const rotation = [...weeklyTrailerItems.slice(index + 1), ...weeklyTrailerItems.slice(0, index + 1)]
        .map(item => String(item.videoId).trim())
        .join(",");
    playerFrame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0&autoplay=1&mute=1&playsinline=1&controls=0&disablekb=1&fs=0&iv_load_policy=3&enablejsapi=1&loop=1&playlist=${encodeURIComponent(rotation)}&start=${HOT_TRAILER_START_SECONDS}&origin=${origin}`;

    loadWeeklyYouTubeApi()
        .then(() => {
            const currentFrame = document.getElementById("weekly-trailer-player");
            if (!currentFrame || weeklyTrailerPlayer || !window.YT?.Player) return;
            weeklyTrailerPlayer = new window.YT.Player(currentFrame, {
                events: {
                    onReady(event) {
                        if (weeklyTrailerMuted) {
                            event.target.mute();
                        } else {
                            event.target.unMute();
                            event.target.setVolume(75);
                        }
                        event.target.playVideo();
                        startWeeklyTrailerMetadataTracking();
                        event.target.getIframe()?.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
                    },
                    onStateChange(event) {
                        if (event.data === window.YT.PlayerState.PLAYING) {
                            weeklyTrailerFailureCount = 0;
                            syncWeeklyTrailerMetadataFromPlayer(event.target);
                            startWeeklyTrailerMetadataTracking();
                        }
                        if (event.data === window.YT.PlayerState.ENDED) advanceWeeklyTrailer();
                    },
                    onError() {
                        weeklyTrailerFailureCount += 1;
                        if (weeklyTrailerFailureCount < weeklyTrailerItems.length) {
                            advanceWeeklyTrailer();
                        } else {
                            showWeeklyTrailerFallback();
                        }
                    }
                }
            });
        })
        .catch(() => {
            // The embed URL already contains a rotating playlist, so playback still works without the JS API.
        });
}

function advanceWeeklyTrailer() {
    if (!weeklyTrailerItems.length) return;
    weeklyTrailerIndex = (weeklyTrailerIndex + 1) % weeklyTrailerItems.length;
    renderWeeklyTrailerItem(weeklyTrailerIndex);
    startWeeklyTrailerPlayback(weeklyTrailerIndex);
}

function showWeeklyTrailerFallback() {
    const playerFrame = document.getElementById("weekly-trailer-player");
    const poster = document.getElementById("weekly-trailer-poster");
    const playButton = document.getElementById("weekly-trailer-play");
    stopWeeklyTrailerMetadataTracking();
    weeklyTrailerPlayer?.stopVideo?.();
    if (playerFrame) playerFrame.hidden = true;
    if (poster) poster.hidden = false;
    if (playButton) playButton.hidden = false;
}

function loadWeeklyYouTubeApi() {
    if (window.YT?.Player) return Promise.resolve();
    if (weeklyTrailerApiPromise) return weeklyTrailerApiPromise;

    weeklyTrailerApiPromise = new Promise((resolve, reject) => {
        const previousReady = window.onYouTubeIframeAPIReady;
        const timeoutId = window.setTimeout(() => reject(new Error("YOUTUBE_API_TIMEOUT")), 12000);
        window.onYouTubeIframeAPIReady = () => {
            window.clearTimeout(timeoutId);
            if (typeof previousReady === "function") previousReady();
            resolve();
        };

        let script = document.querySelector("#weekly-youtube-api");
        if (!script) {
            script = document.createElement("script");
            script.id = "weekly-youtube-api";
            script.src = "https://www.youtube.com/iframe_api";
            script.async = true;
            script.onerror = () => {
                window.clearTimeout(timeoutId);
                reject(new Error("YOUTUBE_API_LOAD_FAILED"));
            };
            document.head.appendChild(script);
        }
    });

    return weeklyTrailerApiPromise;
}

function initWeeklyTrailerPlayer() {
    const media = document.getElementById("weekly-trailer-media");
    const playButton = document.getElementById("weekly-trailer-play");
    const soundButton = document.getElementById("weekly-trailer-sound");
    if (!media || !playButton) return;

    playButton.addEventListener("click", () => {
        const videoId = String(media.dataset.videoId || "").trim();
        if (!/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) return;

        const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
        if (window.location.protocol === "file:") {
            window.open(watchUrl, "_blank", "noopener,noreferrer");
            return;
        }

        startWeeklyTrailerPlayback(weeklyTrailerIndex);
    });

    soundButton?.addEventListener("click", () => {
        weeklyTrailerMuted = !weeklyTrailerMuted;
        syncWeeklyTrailerSound();
    });
    syncWeeklyTrailerSound();
}

function renderCmsTrailerPlaylist() {
    const list = document.querySelector("#hot-trailer-list");
    if (!list || !cmsState) return;

    const trailers = cmsState.trailers.filter(item => item.enabled);
    if (!trailers.length) {
        list.innerHTML = "";
        return;
    }

    list.innerHTML = trailers.map((item, index) => {
        const videoId = escapeHtml(item.videoId);
        return `
        <button class="trailer-card ${index === 0 ? "active" : ""}" type="button"
            data-video="${videoId}"
            data-title="${escapeHtml(item.title)}"
            data-desc="${escapeHtml(item.description)}"
            data-start="${HOT_TRAILER_START_SECONDS}">
            <img src="https://img.youtube.com/vi/${videoId}/maxresdefault.jpg"
                alt="${escapeHtml(item.title)} trailer thumbnail"
                onerror="this.onerror=null;this.src='https://img.youtube.com/vi/${videoId}/hqdefault.jpg';">
            <span>${escapeHtml(item.category)}</span>
            <strong>${escapeHtml(item.title)}</strong>
        </button>
    `;
    }).join("");

    const first = trailers[0];
    const player = document.querySelector("#hot-trailer-player");
    if (player) {
        const origin = encodeURIComponent(window.location.origin);
        player.title = `${first.title} - Trailer`;
        player.src = `https://www.youtube-nocookie.com/embed/${escapeHtml(first.videoId)}?rel=0&modestbranding=1&autoplay=1&mute=1&playsinline=1&controls=0&disablekb=1&fs=0&iv_load_policy=3&enablejsapi=1&start=${HOT_TRAILER_START_SECONDS}&origin=${origin}`;
    }
    setTextContent(".trailer-current-title", first.title);
    setTextContent(".trailer-current-desc", first.description);
}

function setTextContent(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value || "";
}

function renderCmsPosts() {
    const grid = document.getElementById("cms-post-grid");
    if (!grid || !cmsState) return;

    const posts = cmsState.posts
        .filter(item => item.published)
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
        .slice(0, 5);

    if (!posts.length) {
        grid.innerHTML = `<div class="cms-post-empty">Chưa có bài đăng được xuất bản.</div>`;
        return;
    }

    grid.innerHTML = posts.map(item => {
        const date = new Intl.DateTimeFormat("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }).format(new Date(`${item.publishedAt}T00:00:00`));
        const cover = window.VietPatchCMS.safeUrl(item.cover);
        const link = window.VietPatchCMS.safeUrl(item.link);

        return `
            <article class="cms-post">
                <div class="cms-post-cover">
                    ${cover ? `<img src="${escapeHtml(cover)}" alt="${escapeHtml(item.title)}">` : ""}
                    <span class="cms-post-category">${escapeHtml(item.category)}</span>
                </div>
                <div class="cms-post-body">
                    <span class="cms-post-date">${escapeHtml(date)}</span>
                    <h3>${escapeHtml(item.title)}</h3>
                    <p>${escapeHtml(item.excerpt)}</p>
                    ${link ? `<a class="cms-post-link" href="${escapeHtml(link)}" target="_blank" rel="noopener">Đọc tiếp <i class="fa-solid fa-arrow-right"></i></a>` : ""}
                </div>
            </article>
        `;
    }).join("");
}

function normalizePublicRequest(item, fallback = {}) {
    const CMS = window.VietPatchCMS;
    const safeLogo = CMS?.safeAssetUrl(item?.logoUrl || item?.imageUrl) || "";
    const safeLink = CMS?.safeUrl(item?.link) || "";

    return {
        id: String(item?.id || fallback.id || `request-${Date.now()}`),
        title: String(item?.title || fallback.title || "Game chưa đặt tên").trim(),
        logoUrl: safeLogo,
        engine: String(item?.engine || fallback.engine || "Khác").trim(),
        platform: String(item?.platform || fallback.platform || "Nhiều nền tảng").trim(),
        link: safeLink,
        notes: String(item?.notes || fallback.notes || "").trim(),
        votes: Math.max(0, Math.round(Number(item?.votes ?? fallback.votes) || 0)),
        voted: Boolean(item?.voted ?? fallback.voted),
        published: item?.published !== false,
        userCreated: Boolean(item?.userCreated || fallback.userCreated)
    };
}

function loadCommunityRequests() {
    const cmsRequests = Array.isArray(cmsState?.requests) && cmsState.requests.length
        ? cmsState.requests
        : initialRequests;
    let savedRequests = [];

    try {
        savedRequests = JSON.parse(localStorage.getItem("vietpatch_requests") || "[]");
    } catch (error) {
        console.error("Failed to parse requests, loading CMS defaults.", error);
    }

    const savedById = new Map(savedRequests.map(item => [String(item.id), item]));
    const cmsIds = new Set(cmsRequests.map(item => String(item.id)));
    const merged = cmsRequests
        .map(item => normalizePublicRequest(item, savedById.get(String(item.id))))
        .filter(item => item.published);

    savedRequests
        .filter(item => item.userCreated && !cmsIds.has(String(item.id)))
        .map(item => normalizePublicRequest(item))
        .forEach(item => merged.push(item));

    requestsList = merged;
    localStorage.setItem("vietpatch_requests", JSON.stringify(requestsList));
}

function saveCommunityRequests() {
    localStorage.setItem("vietpatch_requests", JSON.stringify(requestsList));
}

// ==========================================================================
// MOCK QR CODE GENERATION ON CANVAS
// ==========================================================================
function generateMockQR(canvasContainerId, text) {
    const container = document.getElementById(canvasContainerId);
    if (!container) return;
    
    // Clear container
    container.innerHTML = "";
    
    // Create canvas
    const canvas = document.createElement("canvas");
    canvas.width = 110;
    canvas.height = 110;
    canvas.style.display = "block";
    container.appendChild(canvas);
    
    const ctx = canvas.getContext("2d");
    const size = canvas.width;
    
    // Fill white background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, size, size);
    
    // Set draw settings
    ctx.fillStyle = "#191919"; // Obsidian Black cells
    const gridSize = 21; // QR version 1 size
    const cellSize = Math.floor(size / gridSize);
    const offset = Math.floor((size - (gridSize * cellSize)) / 2);
    
    // Draw 3 big finder patterns
    drawFinderPattern(ctx, offset, offset, cellSize);
    drawFinderPattern(ctx, offset + (gridSize - 7) * cellSize, offset, cellSize);
    drawFinderPattern(ctx, offset, offset + (gridSize - 7) * cellSize, cellSize);
    
    // Helper to draw random bits but deterministic based on text length
    const seed = text.length;
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            // Skip finder patterns
            if ((r < 7 && c < 7) || (r < 7 && c >= gridSize - 7) || (r >= gridSize - 7 && c < 7)) {
                continue;
            }
            
            // Deterministic random dots
            const pseudoRandom = Math.sin(r * 12.9898 + c * 78.233 + seed) * 43758.5453;
            const isBit = (pseudoRandom - Math.floor(pseudoRandom)) > 0.5;
            
            if (isBit) {
                ctx.fillRect(offset + c * cellSize, offset + r * cellSize, cellSize, cellSize);
            }
        }
    }
}

function drawFinderPattern(ctx, x, y, cellSize) {
    ctx.fillStyle = "#191919";
    ctx.fillRect(x, y, 7 * cellSize, 7 * cellSize);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(x + cellSize, y + cellSize, 5 * cellSize, 5 * cellSize);
    ctx.fillStyle = "#191919";
    ctx.fillRect(x + 2 * cellSize, y + 2 * cellSize, 3 * cellSize, 3 * cellSize);
}

// ==========================================================================
// TOAST NOTIFICATIONS
// ==========================================================================
function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;
    
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let iconClass = "fa-circle-info";
    if (type === "success") iconClass = "fa-circle-check";
    if (type === "error") iconClass = "fa-triangle-exclamation";
    
    toast.innerHTML = `
        <i class="fa-solid ${iconClass}"></i>
        <div class="toast-content">${message}</div>
    `;
    
    container.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
        toast.style.animation = "fadeIn var(--transition-fast) reverse forwards";
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// ==========================================================================
// LOCAL STORAGE PERSISTENCE
// ==========================================================================
async function apiRequest(path, options = {}) {
    const response = await fetch(path, {
        credentials: "include",
        headers: {
            "Accept": "application/json",
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(options.headers || {})
        },
        ...options,
        body: options.body && typeof options.body !== "string"
            ? JSON.stringify(options.body)
            : options.body
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const errorCode = String(payload.error || "");
        const friendlyErrors = {
            ACCOUNT_SERVICE_NOT_CONFIGURED: "Hệ thống tài khoản chưa được cấu hình khóa bảo mật.",
            ALREADY_OWNED: "Bản Việt hóa này đã có trong thư viện của bạn.",
            AMOUNT_MUST_BE_AT_LEAST_10000: "Số tiền nạp tối thiểu là 10.000đ.",
            AMOUNT_TOO_LARGE: "Mỗi lần chỉ có thể nạp tối đa 10.000.000đ.",
            AUTH_REQUIRED: "Vui lòng đăng nhập để tiếp tục.",
            INSUFFICIENT_BALANCE: "Số dư ví không đủ.",
            INVALID_LOGIN: "Email hoặc mật khẩu không đúng.",
            ORDER_NOT_FOUND: "Không tìm thấy đơn thanh toán này.",
            PATCH_UNAVAILABLE: "Bản Việt hóa chưa sẵn sàng để tải.",
            PAYMENT_NOT_CONFIGURED: "Thanh toán VietQR chưa được cấu hình trên máy chủ.",
            HUMAN_VERIFICATION_FAILED: "Xác minh chống bot không hợp lệ. Vui lòng thử lại.",
            HUMAN_VERIFICATION_REQUIRED: "Vui lòng hoàn tất bước xác minh chống bot.",
            HUMAN_VERIFICATION_UNAVAILABLE: "Dịch vụ xác minh đang tạm gián đoạn. Vui lòng thử lại.",
            TOO_MANY_REQUESTS: "Thiết bị này gửi quá nhiều yêu cầu. Vui lòng thử lại sau.",
            TOO_MANY_LOGIN_ATTEMPTS: "Bạn đã thử đăng nhập quá nhiều lần. Hãy chờ 15 phút.",
            USE_FREE_UNLOCK: "Bản Việt hóa này đang miễn phí, hãy thêm thẳng vào thư viện."
        };
        const serviceUnavailable = (response.status === 404 || response.status === 503)
            && String(path).startsWith("/api/vietpatch/");
        const error = new Error(friendlyErrors[errorCode] || errorCode || (serviceUnavailable
            ? "Hệ thống tài khoản đang được kích hoạt. Vui lòng thử lại sau."
            : "Không xử lý được yêu cầu."));
        error.status = response.status;
        error.code = errorCode;
        error.payload = payload;
        throw error;
    }
    return payload;
}

function applyServerUser(serverUser) {
    if (!serverUser) return null;
    userState = {
        loggedIn: Boolean(serverUser.loggedIn),
        username: serverUser.username || "Gamer",
        email: serverUser.email || "",
        balance: Number(serverUser.balance) || 0,
        ownedGames: Array.isArray(serverUser.ownedGames) ? [...new Set(serverUser.ownedGames)] : [],
        joinedAt: serverUser.joinedAt || new Date().toISOString(),
        transactionHistory: Array.isArray(serverUser.transactionHistory) ? serverUser.transactionHistory : []
    };
    saveUserState();
    return userState;
}

function clearAuthenticatedUserCache() {
    userState.loggedIn = false;
    userState.username = "Khách";
    userState.email = "";
    userState.balance = 0;
    userState.ownedGames = [];
    userState.transactionHistory = [];
    saveUserState();
}

async function refreshUserFromServer({ silent = true } = {}) {
    try {
        const payload = await apiRequest("/api/vietpatch/me");
        accountServiceAvailable = true;
        updateAuthServiceNotice();
        applyServerUser(payload.user);
        updateUIForUserSession();
        if (activeTab === "library") renderUserLibrary();
        if (activeTab === "home") renderGamesGrid();
        return userState;
    } catch (error) {
        if (error.status === 401) {
            accountServiceAvailable = true;
            updateAuthServiceNotice();
            clearAuthenticatedUserCache();
            updateUIForUserSession();
            if (!silent) showToast("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", "error");
            return null;
        }
        if (error.status === 404 || error.status === 503) {
            accountServiceAvailable = false;
            updateAuthServiceNotice();
        }
        if (!silent) showToast(error.message || "Không đồng bộ được tài khoản.", "error");
        return null;
    }
}

function updateAuthServiceNotice() {
    const notice = document.getElementById("auth-service-note");
    if (!notice) return;
    notice.hidden = accountServiceAvailable !== false;
}

function loadUserState() {
    localStorage.removeItem("vietpatch_user");
    userState = {
        loggedIn: false,
        username: "Khách",
        email: "",
        balance: 0,
        ownedGames: [],
        joinedAt: new Date().toISOString(),
        transactionHistory: []
    };
    normalizeUserState();
    
    loadCommunityRequests();
}

function saveUserState() {
    normalizeUserState();
    localStorage.removeItem("vietpatch_user");
}

function normalizeUserState() {
    userState.loggedIn = Boolean(userState.loggedIn);
    userState.username = userState.username || "Khách";
    userState.email = userState.email || "";
    userState.balance = Number(userState.balance) || 0;
    userState.ownedGames = Array.isArray(userState.ownedGames) ? [...new Set(userState.ownedGames)] : [];
    userState.joinedAt = userState.joinedAt || new Date().toISOString();
    userState.transactionHistory = Array.isArray(userState.transactionHistory) ? userState.transactionHistory : [];
}

function createTransactionId(prefix = "VP") {
    return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
}

function addTransaction(entry) {
    normalizeUserState();
    const tx = {
        id: entry.id || createTransactionId(entry.type === "deposit" ? "DEP" : "VP"),
        type: entry.type || "purchase",
        title: entry.title || "Giao dịch VietPatch",
        amount: Number(entry.amount) || 0,
        method: entry.method || "wallet",
        status: entry.status || "success",
        gameId: entry.gameId || null,
        balanceAfter: Number.isFinite(entry.balanceAfter) ? entry.balanceAfter : userState.balance,
        createdAt: entry.createdAt || new Date().toISOString()
    };

    userState.transactionHistory.unshift(tx);
    userState.transactionHistory = userState.transactionHistory.slice(0, 80);
    return tx;
}

function formatDateTime(isoString) {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "Không rõ";

    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(date);
}

function updateUIForUserSession() {
    const displayUsername = document.getElementById("display-username");
    const displayBalance = document.getElementById("display-balance");
    const authActionBtn = document.getElementById("auth-action-btn");
    const userAvatar = document.getElementById("user-avatar");
    
    const ddUsername = document.getElementById("dd-username");
    const ddEmail = document.getElementById("dd-email");
    
    const libraryCountBadges = document.querySelectorAll(".library-count");
    libraryCountBadges.forEach(b => {
        b.textContent = userState.ownedGames.length;
    });
    
    if (userState.loggedIn) {
        displayUsername.textContent = userState.username;
        displayBalance.textContent = formatCurrency(userState.balance);
        userAvatar.textContent = String(userState.username || "VP").trim().slice(0, 2).toUpperCase();
        
        ddUsername.textContent = userState.username;
        ddEmail.textContent = userState.email;
        authActionBtn.innerHTML = `<i class="fa-solid fa-right-from-bracket"></i> Đăng Xuất`;
        authActionBtn.classList.add("text-danger");
    } else {
        displayUsername.textContent = "Đăng nhập";
        displayBalance.textContent = "Khách";
        userAvatar.textContent = "VP";
        
        ddUsername.textContent = "Tài khoản khách";
        ddEmail.textContent = "Đăng nhập để giao dịch";
        authActionBtn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> Đăng Nhập`;
        authActionBtn.classList.remove("text-danger");
    }

    if (activeTab === "profile") {
        renderUserProfile();
    }
}

function formatCurrency(val) {
    return val.toLocaleString("vi-VN") + "đ";
}

function startPatchDownload(game) {
    if (!game) return;

    const downloadUrl = window.VietPatchCMS?.safeUrl(game.downloadUrl);
    if (!downloadUrl) {
        showToast(`Chưa có link tải cho ${game.title}. Hãy cập nhật trong Content Studio.`, "error");
        return;
    }

    showToast(`Đang mở nguồn tải patch của ${game.title}...`, "success");
    const downloadWindow = window.open(downloadUrl, "_blank", "noopener,noreferrer");
    if (downloadWindow) downloadWindow.opener = null;
}

async function unlockFreeGame(game) {
    if (!game) return;
    if (!userState.loggedIn) {
        showToast("Vui lòng đăng nhập để nhận patch miễn phí.", "error");
        openAuthModal();
        return;
    }

    try {
        const payload = await apiRequest("/api/vietpatch/free-unlock", {
            method: "POST",
            body: {
                gameId: game.id,
                itemTitle: `Nhận miễn phí: ${game.title}`
            }
        });
        applyServerUser(payload.user);
        updateUIForUserSession();
        showToast(`Đã thêm ${game.title} vào thư viện patch!`, "success");
        renderGamesGrid();
        if (document.getElementById("detail-overlay")?.classList.contains("active")) {
            openGameDetails(game.id);
        }
    } catch (error) {
        if (error.status === 401) {
            showToast("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.", "error");
            openAuthModal();
        } else {
            showToast(error.message || "Không thêm được patch vào thư viện.", "error");
        }
    }
}

// ==========================================================================
// DYNAMIC COMPONENT RENDERING
// ==========================================================================

function getCatalogPageSize() {
    const configured = Number(cmsState?.site?.catalogPageSize);
    return [6, 9, 12].includes(configured) ? configured : 9;
}

function getCatalogBadge(game) {
    const explicit = String(game?.badge || "").toLocaleLowerCase("en");
    if (explicit === "new") return { key: "new", label: "Mới" };
    if (explicit === "hot") return { key: "hot", label: "Nổi bật" };
    if (game?.id === cmsState?.site?.featuredGameId) return { key: "hot", label: "Nổi bật" };
    return null;
}

function renderCatalogPagination(totalItems) {
    const container = document.getElementById("catalog-pagination");
    if (!container) return;

    const pageSize = getCatalogPageSize();
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    currentCatalogPage = Math.min(Math.max(1, currentCatalogPage), totalPages);

    if (totalPages <= 1) {
        container.hidden = true;
        container.innerHTML = "";
        return;
    }

    const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
    container.hidden = false;
    container.innerHTML = `
        <div class="catalog-page-status">
            <span>TRANG</span>
            <strong>${String(currentCatalogPage).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")}</strong>
            <small>${totalItems} hồ sơ · ${pageSize} hồ sơ mỗi trang</small>
        </div>
        <div class="catalog-page-controls" aria-label="Chuyển trang thư viện">
            <button type="button" data-catalog-page="${currentCatalogPage - 1}" ${currentCatalogPage === 1 ? "disabled" : ""} aria-label="Trang trước">
                <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
            </button>
            ${pages.map(page => `
                <button type="button" data-catalog-page="${page}" class="${page === currentCatalogPage ? "active" : ""}" aria-label="Trang ${page}" ${page === currentCatalogPage ? 'aria-current="page"' : ""}>
                    ${String(page).padStart(2, "0")}
                </button>
            `).join("")}
            <button type="button" data-catalog-page="${currentCatalogPage + 1}" ${currentCatalogPage === totalPages ? "disabled" : ""} aria-label="Trang sau">
                <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </button>
        </div>
    `;
}

// Render Game Grid (Main Catalogue)
function renderGamesGrid() {
    const gridContainer = document.getElementById("games-grid-container");
    if (!gridContainer) return;

    const normalizedQuery = normalizeSearchText(searchQuery);
    let filteredGames = getPublicGames().filter(game => {
        const searchIndex = normalizeSearchText([
            game.title,
            game.engine,
            game.developer,
            game.desc,
            ...(Array.isArray(game.tags) ? game.tags : [])
        ].join(" "));
        const matchesSearch = !normalizedQuery || searchIndex.includes(normalizedQuery);
        const matchesEngine = currentFilter === "all" || game.engineKey === currentFilter;
        const matchesAvailability = {
            all: true,
            ready: Number(game.progress) >= 100,
            "in-progress": Number(game.progress) < 100
        }[currentAvailability] ?? true;

        return matchesSearch && matchesEngine && matchesAvailability;
    });

    filteredGames.sort((a, b) => {
        if (currentSort === "newest") {
            return (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0);
        } else if (currentSort === "popular") {
            return parseDownloadCount(b.downloads) - parseDownloadCount(a.downloads);
        } else if (currentSort === "a-z") {
            return String(a.title).localeCompare(String(b.title), "vi", { sensitivity: "base" });
        }
        return 0;
    });
    
    updateCatalogSummary(filteredGames);
    gridContainer.innerHTML = "";

    if (filteredGames.length === 0) {
        renderCatalogPagination(0);
        gridContainer.innerHTML = `
            <div class="empty-state-search">
                <span class="empty-icon"><i class="fa-solid fa-magnifying-glass"></i></span>
                <h3>Chưa tìm thấy patch phù hợp</h3>
                <p>Thử tên game ngắn hơn, chọn lại engine hoặc xóa toàn bộ bộ lọc.</p>
                <button class="empty-reset-btn" type="button"><i class="fa-solid fa-rotate-left"></i> Xóa bộ lọc</button>
            </div>
        `;
        return;
    }

    const pageSize = getCatalogPageSize();
    const totalPages = Math.max(1, Math.ceil(filteredGames.length / pageSize));
    currentCatalogPage = Math.min(Math.max(1, currentCatalogPage), totalPages);
    const startIndex = (currentCatalogPage - 1) * pageSize;
    const pageGames = filteredGames.slice(startIndex, startIndex + pageSize);

    pageGames.forEach(game => {
        const isOwned = userState.ownedGames.includes(game.id);
        const coverImage = getGameCoverImage(game);
        const releaseState = getGameReleaseState(game);
        const badge = getCatalogBadge(game);
        const card = document.createElement("article");
        card.className = `game-card catalog-row state-${releaseState.key}`;

        const progress = Math.max(0, Math.min(100, Number(game.progress) || 0));

        card.innerHTML = `
            <button class="card-header-img" type="button" data-game-id="${escapeHtml(game.id)}" aria-label="Xem chi tiết ${escapeHtml(game.title)}">
                <img src="${escapeHtml(coverImage)}" alt="${escapeHtml(game.title)}" loading="lazy" onerror="this.src='${escapeHtml(getFallbackGameImage(game))}'">
                ${badge ? `<span class="catalog-badge badge-${badge.key}">${badge.label}</span>` : ""}
            </button>
            <div class="catalog-identity">
                <h3 class="card-title">${escapeHtml(game.title)}</h3>
                <p>${escapeHtml(game.developer)} · ${escapeHtml(game.engine)}</p>
            </div>
            <div class="catalog-status status-${releaseState.key}">
                <strong><span aria-hidden="true"></span>${isOwned ? "Trong thư viện" : escapeHtml(releaseState.shortLabel)}</strong>
                <small>${releaseState.key === "in-progress" ? `Tiến độ ${progress}%` : `Cập nhật ${formatGameDate(game.date)}`}</small>
                <div class="catalog-progress" role="progressbar" aria-label="Tiến độ Việt hóa" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}">
                    <i style="width:${progress}%"></i>
                </div>
            </div>
            <dl class="catalog-specs">
                <div><dt>Patch</dt><dd>${escapeHtml(game.version)}</dd></div>
                <div><dt>Dung lượng</dt><dd>${escapeHtml(game.size)}</dd></div>
            </dl>
            <div class="card-footer">
                <button class="card-detail-btn" type="button" data-game-id="${escapeHtml(game.id)}">
                    <span>Mở hồ sơ</span><i class="fa-solid fa-arrow-right"></i>
                </button>
            </div>
        `;
        gridContainer.appendChild(card);
    });

    renderCatalogPagination(filteredGames.length);
}

// Render Hero Carousel Slider
function renderHeroSlider() {
    const sliderContainer = document.getElementById("hero-slider-container");
    const dotsContainer = document.getElementById("carousel-dots-container");
    if (!sliderContainer || !dotsContainer) return;

    const publicGames = getPublicGames();
    const configuredIds = Array.isArray(cmsState?.site?.featuredGameIds)
        ? cmsState.site.featuredGameIds
        : [cmsState?.site?.featuredGameId || "wukong"];
    const featuredGames = configuredIds
        .map(id => publicGames.find(game => game.id === id))
        .filter(Boolean)
        .slice(0, 6);
    if (!featuredGames.length && publicGames[0]) featuredGames.push(...publicGames.slice(0, 3));
    sliderContainer.innerHTML = "";
    dotsContainer.innerHTML = "";

    if (!featuredGames.length) return;

    featuredGames.forEach((game, index) => {
        const heroImage = getGameHeroImage(game);
        const releaseState = getGameReleaseState(game);
        const slide = document.createElement("div");
        slide.className = `hero-slide ${index === 0 ? "active" : ""}`;
        slide.innerHTML = `
            <img class="hero-slide-bg" src="${escapeHtml(heroImage)}" alt="Ảnh bìa ${escapeHtml(game.title)}" onerror="this.src='${escapeHtml(getGameCoverImage(game))}'">
            <span class="photo-note">CẬP NHẬT · ${escapeHtml(formatGameDate(game.date))}</span>
            <article class="feature-sheet">
                <div class="feature-name">
                    <span>Hồ sơ tuyển chọn</span>
                    <h2>${escapeHtml(game.title)}</h2>
                    <p>${escapeHtml(game.developer)} · ${escapeHtml(game.engine)}</p>
                </div>
                <dl class="release-specs">
                    <div><dt>Phiên bản</dt><dd>${escapeHtml(game.version)}</dd></div>
                    <div><dt>Dung lượng</dt><dd>${escapeHtml(game.size)}</dd></div>
                    <div><dt>Trạng thái</dt><dd class="status-${releaseState.key}">${escapeHtml(releaseState.shortLabel)}</dd></div>
                </dl>
                <div class="action-zone">
                    <span class="feature-action-label">Thông tin kỹ thuật</span>
                    <button class="primary-action btn-detail" type="button" data-game-id="${escapeHtml(game.id)}">
                        <span>Mở hồ sơ</span><i class="fa-solid fa-arrow-right"></i>
                    </button>
                </div>
            </article>
        `;
        sliderContainer.appendChild(slide);

        const dot = document.createElement("button");
        dot.className = `carousel-dot ${index === 0 ? "active" : ""}`;
        dot.type = "button";
        dot.dataset.heroSlide = String(index);
        dot.setAttribute("aria-label", `Hiển thị ${game.title}`);
        dot.setAttribute("aria-current", index === 0 ? "true" : "false");
        dotsContainer.appendChild(dot);
    });

    activeHeroSlide = 0;
    startHeroRotation();
}

function startHeroRotation() {
    stopHeroRotation();
    const slides = document.querySelectorAll(".hero-slide");
    if (slides.length <= 1) return;
    heroRotationInterval = window.setInterval(() => {
        goToSlide((activeHeroSlide + 1) % slides.length);
    }, 8000);
}

function stopHeroRotation() {
    if (heroRotationInterval) {
        clearInterval(heroRotationInterval);
        heroRotationInterval = null;
    }
}

function goToSlide(index) {
    const slides = document.querySelectorAll(".hero-slide");
    const dots = document.querySelectorAll(".carousel-dot");
    if (slides.length === 0) return;
    
    slides[activeHeroSlide]?.classList.remove("active");
    dots[activeHeroSlide]?.classList.remove("active");
    
    activeHeroSlide = (index + slides.length) % slides.length;
    
    slides[activeHeroSlide]?.classList.add("active");
    dots[activeHeroSlide]?.classList.add("active");
    dots.forEach((dot, dotIndex) => dot.setAttribute("aria-current", dotIndex === activeHeroSlide ? "true" : "false"));
}

// Render Progress Tracker Tab
function renderProgressTracker() {
    const container = document.getElementById("progress-list-container");
    if (!container) return;

    const averageProgress = progressProjects.length
        ? Math.round(progressProjects.reduce((total, project) => total + project.overallProgress, 0) / progressProjects.length)
        : 0;
    const activeCount = document.getElementById("progress-active-count");
    const average = document.getElementById("progress-average");
    if (activeCount) activeCount.textContent = String(progressProjects.length).padStart(2, "0");
    if (average) average.textContent = String(averageProgress);

    container.innerHTML = "";
    
    progressProjects.forEach((proj, index) => {
        const stage = proj.breakdown.test >= 50
            ? { label: "Kiểm thử", className: "test" }
            : proj.breakdown.edit >= 50
                ? { label: "Giao diện & font", className: "edit" }
                : proj.breakdown.proofread >= 50
                    ? { label: "Hiệu đính", className: "proofread" }
                    : { label: "Dịch thuật", className: "translate" };
        const stages = [
            ["Dịch thuật", proj.breakdown.translate, "translate"],
            ["Hiệu đính", proj.breakdown.proofread, "proofread"],
            ["Giao diện & font", proj.breakdown.edit, "edit"],
            ["Kiểm thử", proj.breakdown.test, "test"]
        ];

        const item = document.createElement("article");
        item.className = "progress-card production-card glass";
        item.innerHTML = `
            <div class="production-cover">
                <span class="production-index">${String(index + 1).padStart(2, "0")}</span>
                <img src="https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${escapeHtml(proj.appid)}/header.jpg" alt="${escapeHtml(proj.title)}" loading="lazy" onerror="this.src='${escapeHtml(getFallbackGameImage(proj))}'">
                <span class="production-stage stage-${stage.className}">${stage.label}</span>
            </div>

            <div class="production-body">
                <header class="production-card-head">
                    <div>
                        <span>${escapeHtml(proj.developer)} · ${escapeHtml(proj.engine)}</span>
                        <h2>${escapeHtml(proj.title)}</h2>
                    </div>
                    <div class="production-total">
                        <strong>${proj.overallProgress}</strong><span>%</span>
                        <small>Tổng tiến độ</small>
                    </div>
                </header>

                <div class="production-master-track" role="progressbar" aria-label="Tổng tiến độ ${escapeHtml(proj.title)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${proj.overallProgress}">
                    <i style="width:${proj.overallProgress}%"></i>
                </div>

                <div class="production-stages">
                    ${stages.map(([label, value, className], stageIndex) => `
                        <div class="production-stage-row">
                            <span class="stage-number">${String(stageIndex + 1).padStart(2, "0")}</span>
                            <span class="stage-name">${label}</span>
                            <div class="stage-track"><i class="stage-${className}" style="width:${value}%"></i></div>
                            <strong>${value}%</strong>
                        </div>
                    `).join("")}
                </div>

                <footer class="production-card-foot">
                    <span><i class="fa-regular fa-calendar"></i>${escapeHtml(proj.releaseDate)}</span>
                    <small>Cập nhật theo từng công đoạn</small>
                </footer>
            </div>
        `;
        container.appendChild(item);
    });
}

// Render Request List
function getRequestInitials(title) {
    return String(title || "VP")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(word => word[0])
        .join("")
        .toUpperCase() || "VP";
}

function renderRequestsList() {
    const container = document.getElementById("requests-list-container");
    if (!container) return;

    const rankedRequests = [...requestsList].sort((a, b) => (Number(b.votes) || 0) - (Number(a.votes) || 0));
    const normalizedQuery = normalizeSearchText(requestQuery);
    const visibleRequests = rankedRequests.filter(req => {
        if (!normalizedQuery) return true;
        return normalizeSearchText([req.title, req.engine, req.platform, req.notes].join(" ")).includes(normalizedQuery);
    });

    const openCount = document.getElementById("request-open-count");
    const voteTotal = document.getElementById("request-vote-total");
    const topName = document.getElementById("request-top-name");
    const totalVotes = requestsList.reduce((total, request) => total + (Number(request.votes) || 0), 0);
    if (openCount) openCount.textContent = String(requestsList.length).padStart(2, "0");
    if (voteTotal) voteTotal.textContent = new Intl.NumberFormat("vi-VN").format(totalVotes);
    if (topName) topName.textContent = rankedRequests[0]?.title || "—";

    const visibleCount = document.getElementById("request-visible-count");
    if (visibleCount) {
        visibleCount.textContent = normalizedQuery
            ? `${visibleRequests.length} / ${requestsList.length} đề xuất`
            : `${requestsList.length} đề xuất`;
    }

    container.innerHTML = "";

    if (!visibleRequests.length) {
        container.innerHTML = `
            <div class="request-empty-state">
                <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
                <div><strong>Chưa có đề xuất phù hợp</strong><span>Thử tìm theo tên game, engine hoặc nền tảng.</span></div>
            </div>
        `;
        return;
    }

    visibleRequests.forEach((req, index) => {
        const rank = rankedRequests.findIndex(item => String(item.id) === String(req.id)) + 1;
        const logoUrl = window.VietPatchCMS?.safeAssetUrl(req.logoUrl) || "";
        const link = window.VietPatchCMS?.safeUrl(req.link) || "";
        const card = document.createElement("article");
        card.className = "req-card bulletin-card glass";
        card.innerHTML = `
            <span class="request-rank">${String(rank).padStart(2, "0")}</span>
            <div class="req-logo ${logoUrl ? "has-logo" : ""}">
                ${logoUrl
                    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(req.title)} logo" loading="lazy">`
                    : `<span>${escapeHtml(getRequestInitials(req.title))}</span>`}
            </div>
            <div class="req-details">
                <div class="req-title-row">
                    <h4>${escapeHtml(req.title)}</h4>
                    <span class="request-tag">${escapeHtml(req.engine)}</span>
                    <span class="request-tag">${escapeHtml(req.platform)}</span>
                </div>
                <p class="req-notes">${escapeHtml(req.notes || "Không có mô tả chi tiết.")}</p>
                <div class="req-meta">
                    <span>Đề xuất từ cộng đồng</span>
                    ${link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">Trang chính thức <i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : ""}
                </div>
            </div>
            <button class="vote-btn ${req.voted ? "voted" : ""}" type="button" data-req-id="${escapeHtml(req.id)}" aria-pressed="${req.voted ? "true" : "false"}" aria-label="Bình chọn ${escapeHtml(req.title)}">
                <i class="fa-solid fa-caret-up"></i>
                <span>${new Intl.NumberFormat("vi-VN").format(req.votes)}</span>
                <small>${req.voted ? "Đã chọn" : "Bình chọn"}</small>
            </button>
        `;
        container.appendChild(card);
    });
    
    // Attach event listeners to vote buttons
    container.querySelectorAll(".vote-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const reqId = btn.getAttribute("data-req-id");
            const reqIndex = requestsList.findIndex(r => String(r.id) === String(reqId));
            
            if (reqIndex !== -1) {
                if (requestsList[reqIndex].voted) {
                    requestsList[reqIndex].votes -= 1;
                    requestsList[reqIndex].voted = false;
                    showToast("Đã hủy bỏ vote.", "info");
                } else {
                    requestsList[reqIndex].votes += 1;
                    requestsList[reqIndex].voted = true;
                    showToast("Cảm ơn bạn đã bình chọn!", "success");
                }
                
                saveCommunityRequests();
                renderRequestsList();
            }
        });
    });
}

// Render User Library Tab
function renderUserLibrary() {
    const gridContainer = document.getElementById("library-grid-container");
    const emptyState = document.getElementById("library-empty-state");
    if (!gridContainer || !emptyState) return;
    
    if (userState.ownedGames.length === 0) {
        gridContainer.style.display = "none";
        emptyState.style.display = "flex";
        return;
    }
    
    emptyState.style.display = "none";
    gridContainer.style.display = "grid";
    gridContainer.innerHTML = "";
    
    // Fetch game details for all owned games
    userState.ownedGames.forEach((gameId, index) => {
        const game = gamesDatabase.find(g => g.id === gameId);
        if (!game) return;
        
        // Generate simulated license key unique to this user + game
        const seed = userState.email + game.id;
        const licKey = generateLicenseKey(seed);
        
        const card = document.createElement("article");
        card.className = "lib-card collection-card glass";
        card.innerHTML = `
            <span class="library-accession">VP / ${String(index + 1).padStart(3, "0")}</span>
            <div class="lib-header-img">
                <img src="${escapeHtml(getGameCoverImage(game))}" alt="${escapeHtml(game.title)}" onerror="this.src='${escapeHtml(getFallbackGameImage(game))}'">
                <div class="lib-header-overlay"></div>
                <span class="library-owned-state"><i class="fa-solid fa-check"></i> Đã lưu</span>
            </div>
            <div class="lib-body">
                <span class="library-card-kicker">${escapeHtml(game.developer)} · ${escapeHtml(game.engine)}</span>
                <h3 class="lib-title">${escapeHtml(game.title)}</h3>
                
                <div class="lib-details-box">
                    <div class="lib-row">
                        <span>Phiên bản</span>
                        <strong>${escapeHtml(game.version)}</strong>
                    </div>
                    <div class="lib-row">
                        <span>Dung lượng</span>
                        <strong>${escapeHtml(game.size)}</strong>
                    </div>
                    <div class="lib-row">
                        <span>Mã hồ sơ</span>
                        <div class="key-code">
                            <span class="key-text">${licKey}</span>
                            <button class="copy-key-btn" type="button" title="Sao chép mã hồ sơ" data-key="${licKey}" aria-label="Sao chép mã hồ sơ"><i class="fa-regular fa-copy"></i></button>
                        </div>
                    </div>
                </div>
                
                <div class="lib-actions">
                    <button class="action-btn-main btn-green btn-download-patch" type="button" data-game-id="${escapeHtml(game.id)}">
                        Tải bản Việt hóa <i class="fa-solid fa-arrow-down"></i>
                    </button>
                    <button class="action-btn-secondary btn-detail" type="button" data-game-id="${escapeHtml(game.id)}">
                        Mở hồ sơ
                    </button>
                </div>
            </div>
        `;
        gridContainer.appendChild(card);
    });
    
    // Attach listener for copying keys
    gridContainer.querySelectorAll(".copy-key-btn").forEach(button => {
        button.addEventListener("click", () => {
            const keyText = button.getAttribute("data-key");
            navigator.clipboard.writeText(keyText).then(() => {
                showToast("Đã sao chép mã hồ sơ.", "success");
            }).catch(() => {
                showToast("Không thể sao chép tự động. Hãy chọn mã và sao chép thủ công.", "error");
            });
        });
    });
    
    // Attach listener for downloading
    gridContainer.querySelectorAll(".btn-download-patch").forEach(btn => {
        btn.addEventListener("click", () => {
            const game = gamesDatabase.find(item => item.id === btn.getAttribute("data-game-id"));
            startPatchDownload(game);
        });
    });
}

function generateLicenseKey(seed) {
    // Basic hash function to generate deterministic keys based on input
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const finalHash = Math.abs(hash).toString(16).toUpperCase().padStart(12, "F");
    const part1 = "VPATCH";
    const part2 = finalHash.substring(0, 4);
    const part3 = finalHash.substring(4, 8);
    const part4 = finalHash.substring(8, 12);
    return `${part1}-${part2}-${part3}-${part4}`;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getSteamImage(game, variant = "header") {
    if (!game?.appid) return "";
    return `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.appid}/${variant}.jpg`;
}

function getFallbackGameImage(game) {
    return "assets/brand/vietpatch-mark.png";
}

function getGameCoverImage(game) {
    return game?.imageUrl || getSteamImage(game, "header") || getFallbackGameImage(game);
}

function getGameHeroImage(game) {
    return game?.heroImageUrl || game?.imageUrl || getSteamImage(game, "library_hero") || getGameCoverImage(game);
}

function renderGameTags(game) {
    const tags = Array.isArray(game?.tags) && game.tags.length
        ? game.tags
        : [game?.engineKey === "ue" ? "UE READY" : "PATCH", `${game?.progress ?? 0}%`];

    return tags.slice(0, 4)
        .map(tag => `<span>${escapeHtml(tag)}</span>`)
        .join("");
}

function getTransactionLabel(tx) {
    const labels = {
        deposit: "Nạp ví",
        bonus: "Quà tài khoản",
        purchase: "Thanh toán patch",
        unlock: "Mở khóa miễn phí"
    };
    return labels[tx.type] || "Giao dịch";
}

function getTransactionIcon(tx) {
    const icons = {
        deposit: "fa-building-columns",
        bonus: "fa-gift",
        purchase: "fa-cart-shopping",
        unlock: "fa-box-open"
    };
    return icons[tx.type] || "fa-receipt";
}

function renderTransactionRows(items, emptyText) {
    if (!items.length) {
        return `
            <div class="history-empty-row">
                <i class="fa-solid fa-receipt"></i>
                <span>${emptyText}</span>
            </div>
        `;
    }

    return items.map(tx => {
        const isPositive = tx.amount >= 0;
        const amountText = tx.amount === 0 ? "0đ" : `${isPositive ? "+" : "-"}${formatCurrency(Math.abs(tx.amount))}`;
        const methodLabel = {
            wallet: "Ví VietPatch",
            vietqr: "VietQR",
            momo: "MoMo",
            system: "Hệ thống",
            free: "Miễn phí"
        }[tx.method] || tx.method;

        return `
            <div class="history-row ${isPositive ? "income" : "expense"}">
                <div class="history-icon"><i class="fa-solid ${getTransactionIcon(tx)}"></i></div>
                <div class="history-main">
                    <strong>${escapeHtml(tx.title)}</strong>
                    <span>${getTransactionLabel(tx)} / ${escapeHtml(methodLabel)} / ${formatDateTime(tx.createdAt)}</span>
                </div>
                <div class="history-amount">
                    <strong>${amountText}</strong>
                    <span>${escapeHtml(tx.id)}</span>
                </div>
            </div>
        `;
    }).join("");
}

function renderUserProfile() {
    const container = document.getElementById("profile-content");
    if (!container) return;

    normalizeUserState();

    if (!userState.loggedIn) {
        container.innerHTML = `
            <div class="profile-guest-card">
                <div class="profile-guest-icon"><i class="fa-solid fa-user-lock"></i></div>
                <div>
                    <h2>Đăng nhập để mở hồ sơ ví</h2>
                    <p>Hồ sơ sẽ hiển thị số dư, lịch sử nạp, lịch sử thanh toán và các patch bạn đã sở hữu.</p>
                </div>
                <button class="action-btn-main profile-login-btn"><i class="fa-solid fa-right-to-bracket"></i> Đăng nhập</button>
            </div>
        `;
        return;
    }

    const history = userState.transactionHistory || [];
    const depositHistory = history.filter(tx => tx.type === "deposit" || tx.type === "bonus");
    const paymentHistory = history.filter(tx => tx.type === "purchase" || tx.type === "unlock");
    const totalDeposited = history
        .filter(tx => tx.type === "deposit")
        .reduce((sum, tx) => sum + Math.max(0, tx.amount), 0);
    const totalSpent = history
        .filter(tx => tx.type === "purchase")
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const latestActivity = history[0] ? formatDateTime(history[0].createdAt) : "Chưa có";
    const ownedTitles = userState.ownedGames
        .map(gameId => gamesDatabase.find(game => game.id === gameId)?.title)
        .filter(Boolean)
        .slice(0, 4);

    container.innerHTML = `
        <div class="profile-layout">
            <section class="profile-id-card">
                <div class="profile-avatar-frame">
                    <span aria-hidden="true">${escapeHtml(String(userState.username || "VP").slice(0, 2).toUpperCase())}</span>
                </div>
                <div class="profile-id-main">
                    <span class="profile-kicker">MEMBER DOSSIER</span>
                    <h2>${escapeHtml(userState.username)}</h2>
                    <p>${escapeHtml(userState.email)}</p>
                    <div class="profile-tags">
                        <span>Joined ${formatDateTime(userState.joinedAt).split(" ")[0]}</span>
                        <span>${userState.ownedGames.length} patch</span>
                    </div>
                </div>
            </section>

            <section class="wallet-card">
                <span class="profile-kicker">VÍ VIETPATCH</span>
                <div class="wallet-balance">${formatCurrency(userState.balance)}</div>
                <p>Cập nhật sau mỗi giao dịch nạp, thanh toán bằng ví hoặc mua qua QR.</p>
                <div class="wallet-actions">
                    <button class="action-btn-main profile-deposit-btn"><i class="fa-solid fa-wallet"></i> Nạp tiền</button>
                    <button class="action-btn-secondary profile-library-btn"><i class="fa-solid fa-bookmark"></i> Thư viện</button>
                </div>
            </section>

            <section class="profile-stat-card">
                <span>Patch sở hữu</span>
                <strong>${userState.ownedGames.length}</strong>
                <small>${ownedTitles.length ? escapeHtml(ownedTitles.join(", ")) : "Chưa có patch"}</small>
            </section>
            <section class="profile-stat-card">
                <span>Tổng đã nạp</span>
                <strong>${formatCurrency(totalDeposited)}</strong>
                <small>Không tính quà hệ thống</small>
            </section>
            <section class="profile-stat-card">
                <span>Đã thanh toán</span>
                <strong>${formatCurrency(totalSpent)}</strong>
                <small>Lần gần nhất: ${latestActivity}</small>
            </section>

            <section class="profile-history-card">
                <div class="profile-section-head">
                    <h3><i class="fa-solid fa-building-columns"></i> Lịch sử nạp ví</h3>
                    <span>${depositHistory.length} giao dịch</span>
                </div>
                <div class="history-list">
                    ${renderTransactionRows(depositHistory, "Chưa có giao dịch nạp ví.")}
                </div>
            </section>

            <section class="profile-history-card">
                <div class="profile-section-head">
                    <h3><i class="fa-solid fa-cart-shopping"></i> Lịch sử thanh toán patch</h3>
                    <span>${paymentHistory.length} giao dịch</span>
                </div>
                <div class="history-list">
                    ${renderTransactionRows(paymentHistory, "Chưa có giao dịch thanh toán patch.")}
                </div>
            </section>
        </div>
    `;
}

// ==========================================================================
// ROUTER & NAVIGATION SYSTEM
// ==========================================================================
function switchTab(tabId) {
    const tabs = document.querySelectorAll(".nav-link");
    const sections = document.querySelectorAll(".tab-content");
    
    let targetSection = document.getElementById(`tab-${tabId}`);
    if (!targetSection) return;
    
    // Set active tab classes
    tabs.forEach(tab => {
        if (tab.getAttribute("data-tab") === tabId) {
            tab.classList.add("active");
        } else {
            tab.classList.remove("active");
        }
    });
    
    sections.forEach(sec => {
        sec.classList.remove("active");
    });
    
    targetSection.classList.add("active");
    activeTab = tabId;
    
    // Scroll to top of tab
    window.scrollTo({ top: 0, behavior: "smooth" });
    
    // Specific tab triggers
    if (tabId === "home") {
        renderGamesGrid();
        startHeroRotation();
    } else {
        stopHeroRotation();
    }
    
    if (tabId === "progress") {
        renderProgressTracker();
    }
    if (tabId === "requests") {
        renderRequestsList();
    }
    if (tabId === "library") {
        renderUserLibrary();
    }
    if (tabId === "profile") {
        renderUserProfile();
    }
}

// ==========================================================================
// DETAILS MODAL / DRAWER SYSTEM
// ==========================================================================
function openGameDetails(gameId) {
    const game = gamesDatabase.find(g => g.id === gameId);
    if (!game) return;
    
    const overlay = document.getElementById("detail-overlay");
    const banner = document.getElementById("detail-banner");
    const engineTag = document.getElementById("detail-engine-tag");
    const title = document.getElementById("detail-title");
    const dev = document.getElementById("detail-dev");
    const version = document.getElementById("detail-version");
    const size = document.getElementById("detail-size");
    const updated = document.getElementById("detail-updated");
    const price = document.getElementById("detail-price");
    const actionBtn = document.getElementById("detail-action-btn");
    const progressFill = document.getElementById("detail-progress-fill");
    const progressNum = document.getElementById("detail-progress-num");
    const desc = document.getElementById("detail-desc");
    
    const creditsContainer = document.getElementById("detail-credits-container");
    const screenshotsContainer = document.getElementById("detail-screenshots-container");
    const notes = document.getElementById("detail-notes");
    
    // Render content
    banner.style.backgroundImage = `url('${getGameHeroImage(game)}')`;
    engineTag.textContent = game.engine;
    engineTag.className = `engine-badge engine-${game.engineKey}`;
    title.textContent = game.title;
    dev.innerHTML = `<i class="fa-solid fa-building"></i> ${escapeHtml(game.developer)}`;
    version.innerHTML = `<i class="fa-solid fa-code-branch"></i> Patch ${escapeHtml(game.version)}`;
    size.innerHTML = `<i class="fa-solid fa-weight-hanging"></i> ${escapeHtml(game.size)}`;
    if (updated) updated.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> Cập nhật ${formatGameDate(game.date)}`;
    
    progressFill.style.width = `${game.progress}%`;
    progressNum.textContent = `${game.progress}% Hoàn Thành`;
    
    desc.textContent = game.desc;
    notes.textContent = game.notes;
    
    // Credits
    const credits = game.credits || {};
    creditsContainer.innerHTML = `
        <div class="credit-item">
            <span class="credit-role">Biên dịch kịch bản</span>
            <span class="credit-name">${escapeHtml(credits.translator || "VietPatch Community")}</span>
        </div>
        <div class="credit-item">
            <span class="credit-role">Hiệu đính nội dung</span>
            <span class="credit-name">${escapeHtml(credits.editor || "Content Studio")}</span>
        </div>
        <div class="credit-item">
            <span class="credit-role">Kỹ thuật & Đóng gói</span>
            <span class="credit-name">${escapeHtml(credits.technical || "Patchroom")}</span>
        </div>
        <div class="credit-item">
            <span class="credit-role">Kiểm tra lỗi (QA)</span>
            <span class="credit-name">${escapeHtml(credits.qa || "QA Board")}</span>
        </div>
    `;
    
    // Screenshots
    screenshotsContainer.innerHTML = "";
    const screenshots = Array.isArray(game.screenshots) && game.screenshots.length
        ? game.screenshots
        : [getGameHeroImage(game)];
    screenshots.forEach(src => {
        const item = document.createElement("div");
        item.className = "screenshot-img";
        item.innerHTML = `
            <button class="screenshot-zoom-btn" type="button" data-image-src="${escapeHtml(src)}" data-image-title="${escapeHtml(game.title)}">
                <img src="${escapeHtml(src)}" alt="Screenshot" onerror="this.src='${escapeHtml(getFallbackGameImage(game))}'">
                <span><i class="fa-solid fa-magnifying-glass-plus"></i> Xem lớn</span>
            </button>
        `;
        screenshotsContainer.appendChild(item);
    });
    
    // Action Button Logic (Buy/Get/Download)
    const isOwned = userState.ownedGames.includes(game.id);
    const releaseState = getGameReleaseState(game);
    actionBtn.disabled = false;

    if (releaseState.key === "in-progress") {
        price.innerHTML = `<span class="detail-state-note"><i class="fa-solid fa-bars-progress"></i> Bản dịch chưa hoàn thành</span>`;
        actionBtn.innerHTML = `<i class="fa-solid fa-clock"></i> THEO DÕI TIẾN ĐỘ ${Math.max(0, Math.min(100, Number(game.progress) || 0))}%`;
        actionBtn.className = "action-btn-main is-disabled";
        actionBtn.disabled = true;
        actionBtn.onclick = null;
    } else if (!releaseState.hasDownload) {
        price.innerHTML = `<span class="detail-state-note"><i class="fa-solid fa-box-open"></i> Chưa phát hành file tải</span>`;
        actionBtn.innerHTML = `<i class="fa-solid fa-clock"></i> ĐANG CHUẨN BỊ FILE PATCH`;
        actionBtn.className = "action-btn-main is-disabled";
        actionBtn.disabled = true;
        actionBtn.onclick = null;
    } else if (isOwned) {
        price.innerHTML = `<span class="text-success" style="font-size:0.95rem; font-weight:700;"><i class="fa-solid fa-circle-check"></i> Đã Sở Hữu</span>`;
        actionBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-down"></i> TẢI FILE PATCH`;
        actionBtn.className = "action-btn-main btn-green";
        actionBtn.onclick = () => startPatchDownload(game);
    } else if (game.price === 0) {
        price.innerHTML = `<span class="text-success">MIỄN PHÍ</span>`;
        actionBtn.innerHTML = `<i class="fa-solid fa-plus"></i> LƯU VÀO THƯ VIỆN`;
        actionBtn.className = "action-btn-main btn-green";
        actionBtn.onclick = () => unlockFreeGame(game);
    } else {
        price.textContent = formatCurrency(game.price);
        actionBtn.innerHTML = `<i class="fa-solid fa-credit-card"></i> THANH TOÁN`;
        actionBtn.className = "action-btn-main";
        actionBtn.onclick = () => {
            // Trigger purchase flow
            openCheckout(game.id);
        };
    }
    
    // Open Overlay
    detailReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    overlay.classList.add("active");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden"; // Disable scroll behind
    requestAnimationFrame(() => overlay.querySelector(".detail-panel")?.focus());
}

function closeGameDetails() {
    const overlay = document.getElementById("detail-overlay");
    overlay.classList.remove("active");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = ""; // Enable scroll
    detailReturnFocus?.focus?.();
    detailReturnFocus = null;
}

function openImageLightbox(src, title = "Ảnh bản dịch Việt hóa") {
    const lightbox = document.getElementById("image-lightbox");
    const image = document.getElementById("image-lightbox-img");
    const caption = document.getElementById("image-lightbox-caption");
    if (!lightbox || !image || !caption || !src) return;

    image.src = src;
    image.alt = title;
    caption.textContent = title;
    lightbox.classList.add("active");
    lightbox.setAttribute("aria-hidden", "false");
}

function closeImageLightbox() {
    const lightbox = document.getElementById("image-lightbox");
    const image = document.getElementById("image-lightbox-img");
    if (!lightbox || !image) return;

    lightbox.classList.remove("active");
    lightbox.setAttribute("aria-hidden", "true");
    image.removeAttribute("src");
}

// ==========================================================================
// CHECKOUT & PAYMENT FLOW
// ==========================================================================
let currentCheckoutGameId = null;
let currentTransactionType = "buy"; // "buy" or "deposit"
let pendingDepositAmount = 0;
let pendingDepositMethod = "vietqr";
let pendingTransactionId = "";
let pendingServerOrder = null;
let pendingWalletPurchase = null;

async function createVietPatchPaymentOrder({ amount, itemTitle, itemType, gameId }) {
    return apiRequest("/api/vietpatch/orders", {
        method: "POST",
        body: { amount, itemTitle, itemType, gameId }
    });
}

async function fetchVietPatchOrder(orderId) {
    return apiRequest(`/api/vietpatch/orders/${encodeURIComponent(orderId)}`);
}

function renderServerPaymentOrder(order) {
    pendingServerOrder = order;
    pendingTransactionId = order.memo || order.orderId;
    document.getElementById("checkout-txid").textContent = order.memo || order.orderId;
    const qr = document.getElementById("qr-code-display");
    const qrUrl = order.qrUrl || `/api/vietpatch/orders/${encodeURIComponent(order.orderId)}/qr`;
    qr.innerHTML = `<img src="${escapeHtml(qrUrl)}" alt="VietQR ${escapeHtml(order.orderId)}">`;
    document.getElementById("btn-verify-payment").innerHTML = `<i class="fa-solid fa-rotate"></i> KIỂM TRA THANH TOÁN`;
}

async function openCheckout(gameId) {
    const game = gamesDatabase.find(g => g.id === gameId);
    if (!game) return;
    
    // Check if user is logged in
    if (!userState.loggedIn) {
        showToast("Vui lòng đăng nhập trước khi thực hiện giao dịch.", "error");
        openAuthModal();
        return;
    }
    
    currentCheckoutGameId = gameId;
    currentTransactionType = "buy";
    pendingServerOrder = null;
    pendingWalletPurchase = null;
    
    const checkoutItemName = document.getElementById("checkout-item-name");
    const checkoutAmount = document.getElementById("checkout-amount");
    const checkoutTxId = document.getElementById("checkout-txid");
    
    checkoutItemName.textContent = `Patch Việt hóa: ${game.title}`;
    checkoutAmount.textContent = formatCurrency(game.price);
    
    const verifyBtn = document.getElementById("btn-verify-payment");
    if (userState.balance >= game.price) {
        verifyBtn.innerHTML = `<i class="fa-solid fa-wallet"></i> THANH TOÁN BẰNG VÍ (Số dư: ${formatCurrency(userState.balance)})`;
        pendingWalletPurchase = {
            gameId: game.id,
            amount: game.price,
            itemTitle: `Patch Việt hóa: ${game.title}`
        };
        pendingTransactionId = createTransactionId("WALLET");
        checkoutTxId.textContent = "Ví VietPatch";
        setTransactionView("paying");
        document.getElementById("transaction-modal").classList.add("active");
        return;
    } else {
        verifyBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ĐANG TẠO VIETQR`;
    }

    checkoutTxId.textContent = "Đang tạo...";
    setTransactionView("loading");
    document.getElementById("transaction-modal").classList.add("active");

    try {
        const order = await createVietPatchPaymentOrder({
            amount: game.price,
            itemTitle: `Patch Việt hóa: ${game.title}`,
            itemType: "purchase",
            gameId: game.id
        });
        renderServerPaymentOrder(order);
        setTransactionView("paying");
    } catch (error) {
        closeTransactionModal();
        if (error.status === 401) {
            showToast("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", "error");
            openAuthModal();
        } else {
            showToast(error.message || "Không tạo được VietQR thanh toán.", "error");
        }
    }
}

async function openDepositCheckout(amount, method) {
    currentTransactionType = "deposit";
    currentCheckoutGameId = null;
    pendingDepositAmount = amount;
    pendingDepositMethod = method || "vietqr";
    pendingServerOrder = null;
    pendingWalletPurchase = null;
    
    const checkoutItemName = document.getElementById("checkout-item-name");
    const checkoutAmount = document.getElementById("checkout-amount");
    const checkoutTxId = document.getElementById("checkout-txid");
    
    checkoutItemName.textContent = `Nạp tiền ví tài khoản VietPatch`;
    checkoutAmount.textContent = formatCurrency(amount);
    
    checkoutTxId.textContent = "Đang tạo...";
    document.getElementById("btn-verify-payment").innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ĐANG TẠO VIETQR`;
    setTransactionView("loading");
    document.getElementById("transaction-modal").classList.add("active");

    try {
        const order = await createVietPatchPaymentOrder({
            amount,
            itemTitle: "Nạp tiền ví VietPatch",
            itemType: "deposit",
            gameId: "wallet"
        });
        renderServerPaymentOrder(order);
        setTransactionView("paying");
    } catch (error) {
        closeTransactionModal();
        showToast(error.message || "Không tạo được VietQR nạp tiền.", "error");
    }
}

function setTransactionView(state) {
    const viewPaying = document.getElementById("trans-state-paying");
    const viewLoading = document.getElementById("trans-state-loading");
    const viewSuccess = document.getElementById("trans-state-success");
    
    viewPaying.classList.remove("active");
    viewLoading.classList.remove("active");
    viewSuccess.classList.remove("active");
    
    if (state === "paying") viewPaying.classList.add("active");
    if (state === "loading") viewLoading.classList.add("active");
    if (state === "success") viewSuccess.classList.add("active");
}

async function processPaymentVerification() {
    setTransactionView("loading");

    if (pendingWalletPurchase) {
        try {
            const payload = await apiRequest("/api/vietpatch/wallet-purchase", {
                method: "POST",
                body: pendingWalletPurchase
            });
            const game = gamesDatabase.find(item => item.id === pendingWalletPurchase.gameId);
            applyServerUser(payload.user);
            updateUIForUserSession();
            pendingWalletPurchase = null;
            showTransactionSuccess(
                `Đã thanh toán ${formatCurrency(game?.price || 0)} bằng ví. Patch ${game?.title || "đã chọn"} đã được thêm vào Thư viện.`
            );
        } catch (error) {
            setTransactionView("paying");
            if (error.status === 401) {
                closeTransactionModal();
                showToast("Vui lòng đăng nhập lại để thanh toán bằng ví.", "error");
                openAuthModal();
            } else {
                showToast(error.message || "Không thanh toán được bằng ví.", "error");
            }
        }
        return;
    }

    if (pendingServerOrder) {
        try {
            const latestOrder = await fetchVietPatchOrder(pendingServerOrder.orderId);
            pendingServerOrder = latestOrder;

            if (latestOrder.status !== "paid") {
                setTransactionView("paying");
                showToast("Chưa nhận được thanh toán. Hãy chuyển khoản đúng số tiền và nội dung QR rồi kiểm tra lại.", "info");
                return;
            }

            if (latestOrder.user) {
                applyServerUser(latestOrder.user);
                updateUIForUserSession();
            } else {
                await refreshUserFromServer({ silent: true });
            }

            if (currentTransactionType === "buy") {
                const game = gamesDatabase.find(g => g.id === currentCheckoutGameId);
                if (!game) throw new Error("Không tìm thấy game trong đơn.");
                showTransactionSuccess(`Hệ thống đã xác nhận thanh toán ${formatCurrency(game.price)}. Bản patch của game ${game.title} đã được thêm vào Thư viện.`);
                return;
            }

            showTransactionSuccess(`Nạp tiền thành công! Đã nạp thêm ${formatCurrency(pendingDepositAmount)} vào ví tài khoản của bạn.`);
        } catch (error) {
            setTransactionView("paying");
            showToast(error.message || "Không kiểm tra được thanh toán.", "error");
        }
        return;
    }

    setTransactionView("paying");
    showToast("Giao dịch này chưa có đơn server. Hãy tạo lại đơn thanh toán.", "error");
}

function showTransactionSuccess(message) {
    const successMsgElement = document.getElementById("trans-success-message");
    const unlockedBox = document.getElementById("unlocked-info-box");
    const licKeyElement = document.getElementById("unlocked-license-key");
    const btnDownload = document.getElementById("btn-success-download");
    
    successMsgElement.textContent = message;
    
    if (currentTransactionType === "buy") {
        unlockedBox.style.display = "block";
        const game = gamesDatabase.find(g => g.id === currentCheckoutGameId);
        const lic = generateLicenseKey(userState.email + game.id);
        licKeyElement.textContent = lic;
        
        btnDownload.style.display = "block";
        btnDownload.onclick = () => {
            startPatchDownload(game);
            closeTransactionModal();
        };
    } else {
        unlockedBox.style.display = "none";
        btnDownload.style.display = "none";
    }
    
    setTransactionView("success");
}

function closeTransactionModal() {
    document.getElementById("transaction-modal").classList.remove("active");
    if (currentCheckoutGameId) {
        renderGamesGrid();
        if (activeTab === "library") renderUserLibrary();
    }
    if (activeTab === "profile") renderUserProfile();
    currentCheckoutGameId = null;
    pendingServerOrder = null;
}

// ==========================================================================
// DEPOSIT MODAL MANAGEMENT
// ==========================================================================
function openDepositModal() {
    // Check login
    if (!userState.loggedIn) {
        showToast("Vui lòng đăng nhập để nạp tiền vào tài khoản.", "error");
        openAuthModal();
        return;
    }
    
    document.getElementById("deposit-modal").classList.add("active");
}

function closeDepositModal() {
    document.getElementById("deposit-modal").classList.remove("active");
}

// ==========================================================================
// AUTHENTICATION MODAL MANAGEMENT
// ==========================================================================
function openAuthModal() {
    updateAuthServiceNotice();
    document.getElementById("auth-modal").classList.add("active");
    void ensureTurnstileWidget(activeAuthMode());
}

function closeAuthModal() {
    document.getElementById("auth-modal").classList.remove("active");
}

function loadTurnstileScript() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (turnstileScriptPromise) return turnstileScriptPromise;
    turnstileScriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.onload = () => resolve(window.turnstile);
        script.onerror = () => reject(new Error("TURNSTILE_SCRIPT_FAILED"));
        document.head.appendChild(script);
    });
    return turnstileScriptPromise;
}

async function initializeAuthSecurity() {
    try {
        const config = await apiRequest("/api/vietpatch/auth/config");
        authSecurityConfig = {
            googleEnabled: Boolean(config.googleEnabled),
            turnstile: {
                enabled: Boolean(config.turnstile?.enabled),
                siteKey: String(config.turnstile?.siteKey || "")
            }
        };
    } catch {
        authSecurityConfig = {
            googleEnabled: false,
            turnstile: { enabled: false, siteKey: "" }
        };
    }

    const googleButton = document.getElementById("google-auth-btn");
    const divider = document.getElementById("auth-divider");
    if (googleButton) googleButton.hidden = !authSecurityConfig.googleEnabled;
    if (divider) divider.hidden = !authSecurityConfig.googleEnabled;

    if (authSecurityConfig.turnstile.enabled) {
        try {
            await loadTurnstileScript();
            if (document.getElementById("auth-modal")?.classList.contains("active")) {
                await ensureTurnstileWidget(activeAuthMode());
            }
        } catch {
            showToast("Không tải được lớp xác minh chống bot. Vui lòng tải lại trang.", "error");
        }
    }
}

function activeAuthMode() {
    return document.getElementById("register-form")?.classList.contains("active")
        ? "register"
        : "login";
}

async function ensureTurnstileWidget(mode = activeAuthMode()) {
    if (!authSecurityConfig.turnstile.enabled) return;
    const turnstile = await loadTurnstileScript();
    const container = document.getElementById(`${mode}-turnstile`);
    if (!container || !turnstile) return;
    container.hidden = false;
    if (turnstileWidgets[mode] !== null) return;
    turnstileWidgets[mode] = turnstile.render(container, {
        sitekey: authSecurityConfig.turnstile.siteKey,
        action: mode,
        theme: "light",
        size: "flexible",
        appearance: "interaction-only",
        callback: token => {
            turnstileTokens[mode] = String(token || "");
        },
        "expired-callback": () => {
            turnstileTokens[mode] = "";
        },
        "error-callback": () => {
            turnstileTokens[mode] = "";
            return true;
        }
    });
}

function currentTurnstileToken(mode) {
    if (!authSecurityConfig.turnstile.enabled) return "";
    if (turnstileTokens[mode]) return turnstileTokens[mode];
    const widgetId = turnstileWidgets[mode];
    return widgetId !== null && window.turnstile
        ? String(window.turnstile.getResponse(widgetId) || "")
        : "";
}

function resetTurnstile(mode) {
    turnstileTokens[mode] = "";
    const widgetId = turnstileWidgets[mode];
    if (widgetId !== null && window.turnstile) window.turnstile.reset(widgetId);
}

function handleGoogleAuthResult() {
    const url = new URL(window.location.href);
    const result = url.searchParams.get("auth");
    if (!result) return;
    url.searchParams.delete("auth");
    history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    if (result === "google-success") {
        showToast("Đã đăng nhập an toàn bằng Google.", "success");
    } else if (result === "google-error") {
        showToast("Không thể xác minh tài khoản Google. Vui lòng thử lại.", "error");
    }
}

async function handleLogin(email, password, turnstileToken = "") {
    const submitButton = document.querySelector("#login-form .auth-submit-btn");
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = `Đang đăng nhập <i class="fa-solid fa-spinner fa-spin"></i>`;
    }
    try {
        const payload = await apiRequest("/api/vietpatch/auth/login", {
            method: "POST",
            body: { email, password, turnstileToken }
        });
        applyServerUser(payload.user);
        updateUIForUserSession();
        closeAuthModal();
        showToast(`Chào mừng quay trở lại, ${userState.username}!`, "success");
        if (activeTab === "library") renderUserLibrary();
        if (activeTab === "home") renderGamesGrid();
        if (currentCheckoutGameId) openGameDetails(currentCheckoutGameId);
    } catch (error) {
        showToast(error.status === 401 ? "Email hoặc mật khẩu không đúng." : (error.message || "Không đăng nhập được."), "error");
    } finally {
        resetTurnstile("login");
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = `Đăng nhập <i class="fa-solid fa-arrow-right"></i>`;
        }
    }
}

async function handleRegister(username, email, password, turnstileToken = "") {
    const submitButton = document.querySelector("#register-form .auth-submit-btn");
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = `Đang tạo tài khoản <i class="fa-solid fa-spinner fa-spin"></i>`;
    }
    try {
        const payload = await apiRequest("/api/vietpatch/auth/register", {
            method: "POST",
            body: { username, email, password, turnstileToken }
        });
        applyServerUser(payload.user);
        updateUIForUserSession();
        closeAuthModal();
        showToast("Tài khoản đã được tạo và bộ sưu tập đã sẵn sàng.", "success");
        if (activeTab === "library") renderUserLibrary();
        if (activeTab === "home") renderGamesGrid();
    } catch (error) {
        const message = {
            EMAIL_EXISTS: "Email này đã có tài khoản.",
            WEAK_PASSWORD: "Mật khẩu cần tối thiểu 8 ký tự.",
            INVALID_EMAIL: "Email chưa hợp lệ.",
            INVALID_USERNAME: "Tên hiển thị cần tối thiểu 2 ký tự."
        }[error.code || error.message] || error.message || "Không tạo được tài khoản.";
        showToast(message, "error");
    } finally {
        resetTurnstile("register");
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = `Tạo tài khoản <i class="fa-solid fa-arrow-right"></i>`;
        }
    }
}

async function handleLogout() {
    try {
        await apiRequest("/api/vietpatch/auth/logout", { method: "POST" });
    } catch {}
    userState.loggedIn = false;
    userState.username = "Khách";
    userState.email = "";
    userState.balance = 0;
    userState.ownedGames = [];
    userState.transactionHistory = [];
    saveUserState();
    updateUIForUserSession();
    showToast("Đã đăng xuất tài khoản.", "info");

    if (activeTab === "library") renderUserLibrary();
    if (activeTab === "home") renderGamesGrid();
    if (activeTab === "profile") renderUserProfile();
}

function initHotTrailerBanner() {
    const playerFrame = document.querySelector("#hot-trailer-player");
    const list = document.querySelector("#hot-trailer-list");
    const title = document.querySelector(".trailer-current-title");
    const desc = document.querySelector(".trailer-current-desc");
    const soundToggle = document.querySelector(".trailer-sound-toggle");
    const trailerFrame = playerFrame?.closest(".trailer-frame");
    const trailerPoster = document.querySelector("#trailer-poster");
    const trailerPosterImg = trailerPoster?.querySelector("img");
    if (!playerFrame || !list) return;

    const cards = Array.from(list.querySelectorAll(".trailer-card"));
    if (!cards.length) return;

    let activeIndex = Math.max(0, cards.findIndex(card => card.classList.contains("active")));
    let isTrailerMuted = true;
    let trailerPlayer = null;
    let progressTimer = null;
    let posterTimer = null;
    let lastEndedVideoId = null;

    list.dataset.autoMode = "ended";
    list.dataset.playerApi = "loading";

    const getTrailerStart = (card) => {
        const rawStart = Number(card?.getAttribute("data-start"));
        if (!Number.isFinite(rawStart)) return HOT_TRAILER_START_SECONDS;
        return Math.max(0, Math.round(rawStart));
    };

    const buildTrailerUrl = (videoId, startSeconds = HOT_TRAILER_START_SECONDS) => {
        const origin = encodeURIComponent(window.location.origin);
        const muteState = isTrailerMuted ? 1 : 0;
        return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1&mute=${muteState}&playsinline=1&controls=0&disablekb=1&fs=0&iv_load_policy=3&enablejsapi=1&start=${startSeconds}&origin=${origin}`;
    };

    const sendPlayerCommand = (func, args = []) => {
        if (!playerFrame.contentWindow) return;

        playerFrame.contentWindow.postMessage(JSON.stringify({
            event: "command",
            func,
            args
        }), "https://www.youtube-nocookie.com");
    };

    const renderSoundToggle = () => {
        if (!soundToggle) return;

        const icon = soundToggle.querySelector("i");
        const label = soundToggle.querySelector("span");
        soundToggle.classList.toggle("is-muted", isTrailerMuted);
        soundToggle.setAttribute("aria-pressed", String(!isTrailerMuted));
        soundToggle.setAttribute("aria-label", isTrailerMuted ? "Bật âm trailer" : "Tắt âm trailer");
        if (icon) icon.className = `fa-solid ${isTrailerMuted ? "fa-volume-xmark" : "fa-volume-high"}`;
        if (label) label.textContent = isTrailerMuted ? "Âm tắt" : "Tắt âm";
    };

    const syncPlayerSound = () => {
        if (trailerPlayer && typeof trailerPlayer.mute === "function") {
            if (isTrailerMuted) {
                trailerPlayer.mute();
                return;
            }

            trailerPlayer.unMute();
            trailerPlayer.setVolume(70);
            return;
        }

        if (isTrailerMuted) {
            sendPlayerCommand("mute");
            return;
        }

        sendPlayerCommand("unMute");
        sendPlayerCommand("setVolume", [70]);
    };

    const showTrailerPoster = (card) => {
        const videoId = card?.getAttribute("data-video");
        const videoTitle = card?.getAttribute("data-title") || "";
        if (trailerPosterImg && videoId) {
            trailerPosterImg.onerror = () => {
                trailerPosterImg.onerror = null;
                trailerPosterImg.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            };
            trailerPosterImg.src = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
            trailerPosterImg.alt = videoTitle;
        }

        window.clearTimeout(posterTimer);
        trailerPoster?.classList.remove("is-hidden");
        trailerFrame?.classList.remove("is-playing");
    };

    const hideTrailerPoster = (delay = 850) => {
        window.clearTimeout(posterTimer);
        posterTimer = window.setTimeout(() => {
            trailerPoster?.classList.add("is-hidden");
            trailerFrame?.classList.add("is-playing");
        }, delay);
    };

    const resetTrailerProgress = () => {
        cards.forEach(card => card.style.setProperty("--trailer-progress", "0%"));
    };

    const updateTrailerProgressFromValues = (currentTime, duration) => {
        if (!duration || Number.isNaN(duration)) return;

        const progress = Math.min(100, Math.max(0, (currentTime / duration) * 100));
        const activeCard = cards[activeIndex];
        if (activeCard) activeCard.style.setProperty("--trailer-progress", `${progress}%`);
    };

    const updateTrailerProgress = () => {
        if (!trailerPlayer || typeof trailerPlayer.getDuration !== "function") return;

        updateTrailerProgressFromValues(trailerPlayer.getCurrentTime(), trailerPlayer.getDuration());
    };

    const stopProgressTracking = () => {
        window.clearInterval(progressTimer);
        progressTimer = null;
    };

    const startProgressTracking = () => {
        stopProgressTracking();
        updateTrailerProgress();
        progressTimer = window.setInterval(updateTrailerProgress, 500);
    };

    const handleTrailerEnded = () => {
        const activeCard = cards[activeIndex];
        const activeVideoId = activeCard?.getAttribute("data-video");
        if (!activeCard || lastEndedVideoId === activeVideoId) return;

        lastEndedVideoId = activeVideoId;
        stopProgressTracking();
        activeCard.style.setProperty("--trailer-progress", "100%");
        setActiveTrailer((activeIndex + 1) % cards.length);
    };

    const handleYouTubeMessage = (event) => {
        if (!event.origin || !event.origin.includes("youtube")) return;

        let data = event.data;
        if (typeof data === "string") {
            try {
                data = JSON.parse(data);
            } catch {
                return;
            }
        }

        if (!data || typeof data !== "object") return;

        if (data.event === "onReady") {
            list.dataset.playerApi = "ready";
            syncPlayerSound();
            return;
        }

        if (data.event === "infoDelivery" && data.info) {
            const info = data.info;
            if (typeof info.currentTime === "number" && typeof info.duration === "number") {
                updateTrailerProgressFromValues(info.currentTime, info.duration);
            }

            if (info.playerState === 0) handleTrailerEnded();
            return;
        }

        if (data.event === "onStateChange" && data.info === 0) {
            handleTrailerEnded();
        }
    };

    const loadYouTubeIframeApi = (callback) => {
        if (window.YT && window.YT.Player) {
            callback();
            return;
        }

        window.__vietPatchYouTubeReadyCallbacks = window.__vietPatchYouTubeReadyCallbacks || [];
        window.__vietPatchYouTubeReadyCallbacks.push(callback);

        if (window.__vietPatchYouTubeApiLoading) return;

        const previousReady = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            if (typeof previousReady === "function") previousReady();
            const callbacks = window.__vietPatchYouTubeReadyCallbacks || [];
            window.__vietPatchYouTubeReadyCallbacks = [];
            callbacks.forEach(readyCallback => readyCallback());
        };

        window.__vietPatchYouTubeApiLoading = true;
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        script.onerror = () => {
            list.dataset.playerApi = "unavailable";
        };
        document.head.appendChild(script);
    };

    const initYouTubePlayer = () => {
        if (trailerPlayer || !window.YT || !window.YT.Player) return;

        trailerPlayer = new window.YT.Player(playerFrame, {
            host: "https://www.youtube-nocookie.com",
            events: {
                onReady: () => {
                    list.dataset.playerApi = "ready";
                    syncPlayerSound();
                    if (typeof trailerPlayer.playVideo === "function") trailerPlayer.playVideo();
                    startProgressTracking();
                },
                onStateChange: (event) => {
                    if (!window.YT || !window.YT.PlayerState) return;

                    if (event.data === window.YT.PlayerState.PLAYING) {
                        hideTrailerPoster(450);
                        startProgressTracking();
                        return;
                    }

                    if (event.data === window.YT.PlayerState.ENDED) {
                        handleTrailerEnded();
                    }
                }
            }
        });
    };

    const setActiveTrailer = (index) => {
        const card = cards[index];
        if (!card) return;

        activeIndex = index;
        lastEndedVideoId = null;
        resetTrailerProgress();
        cards.forEach(item => item.classList.remove("active"));
        card.classList.add("active");
        showTrailerPoster(card);

        const videoId = card.getAttribute("data-video");
        const videoTitle = card.getAttribute("data-title");
        const videoDesc = card.getAttribute("data-desc");

        playerFrame.title = `${videoTitle} - Trailer`;
        if (title) title.textContent = videoTitle;
        if (desc) desc.textContent = videoDesc;

        const startSeconds = getTrailerStart(card);

        if (trailerPlayer && typeof trailerPlayer.loadVideoById === "function") {
            trailerPlayer.loadVideoById({ videoId, startSeconds });
            window.setTimeout(syncPlayerSound, 250);
            hideTrailerPoster(1600);
            startProgressTracking();
            return;
        }

        playerFrame.src = buildTrailerUrl(videoId, startSeconds);
        hideTrailerPoster(2200);
        window.setTimeout(syncPlayerSound, 650);
    };

    list.addEventListener("click", (event) => {
        const card = event.target.closest(".trailer-card");
        if (!card) return;

        setActiveTrailer(cards.indexOf(card));
    });

    if (soundToggle) {
        soundToggle.addEventListener("click", () => {
            isTrailerMuted = !isTrailerMuted;
            renderSoundToggle();
            syncPlayerSound();
        });
    }

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            stopProgressTracking();
            return;
        }

        if (trailerPlayer && typeof trailerPlayer.playVideo === "function") trailerPlayer.playVideo();
        startProgressTracking();
    });

    window.addEventListener("message", handleYouTubeMessage);
    renderSoundToggle();
    setActiveTrailer(activeIndex);
    loadYouTubeIframeApi(initYouTubePlayer);
}

// ==========================================================================
// INITIALIZATION & EVENT LISTENERS ATTACHMENTS
// ==========================================================================
document.addEventListener("DOMContentLoaded", async () => {
    const cmsReady = initializeCmsContent();
    const authSecurityReady = initializeAuthSecurity();

    // 1. Load User Session
    loadUserState();
    updateUIForUserSession();
    const userRefresh = refreshUserFromServer({ silent: true });
    Promise.allSettled([authSecurityReady, userRefresh]).then(handleGoogleAuthResult);

    // 2. Render Initial views
    renderGamesGrid();
    renderHeroSlider();
    initWeeklyTrailerPlayer();

    cmsReady
        .then(() => {
            renderGamesGrid();
            renderHeroSlider();
        })
        .catch(() => {
            showToast("Đang dùng dữ liệu lưu sẵn vì chưa kết nối được máy chủ nội dung.", "info");
        });
    
    // 3. Tab switching listeners
    document.getElementById("open-catalog-index-btn")?.addEventListener("click", () => {
        document.querySelector(".catalog-section")?.scrollIntoView({ behavior: "smooth" });
    });

    document.querySelectorAll("[data-tab]").forEach(el => {
        el.addEventListener("click", (e) => {
            e.preventDefault();
            const tabId = el.getAttribute("data-tab");
            switchTab(tabId);
            document.getElementById("primary-navigation")?.classList.remove("is-open");
            const menuToggle = document.getElementById("mobile-menu-toggle");
            menuToggle?.setAttribute("aria-expanded", "false");
            if (menuToggle) menuToggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
            
            // Close dropdown if clicked dropdown item
            document.getElementById("user-profile-widget")?.classList.remove("menu-open");
            document.getElementById("user-dropdown-menu").style.display = "none";
            // Set opacity reset for hover state
            setTimeout(() => {
                document.getElementById("user-dropdown-menu").style.display = "";
            }, 500);
        });
    });
    
    // 4. Logo button go home
    document.getElementById("logo-btn").addEventListener("click", () => {
        switchTab("home");
    });
    
    // 5. Global and hero search
    const searchInput = document.getElementById("global-search");
    searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        currentCatalogPage = 1;
        const heroSearch = document.getElementById("hero-search");
        if (heroSearch && heroSearch.value !== searchQuery) heroSearch.value = searchQuery;
        renderGamesGrid();
    });
    searchInput.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        revealCatalog();
    });

    const heroSearchForm = document.getElementById("hero-search-form");
    const heroSearchInput = document.getElementById("hero-search");
    heroSearchForm?.addEventListener("submit", (e) => {
        e.preventDefault();
        searchQuery = heroSearchInput?.value || "";
        currentCatalogPage = 1;
        syncCatalogControls();
        renderGamesGrid();
        revealCatalog();
    });

    // 6. Filter Engine Buttons
    const filterBtns = document.querySelectorAll("#engine-filters .filter-btn");
    filterBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            filterBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            currentFilter = btn.getAttribute("data-filter");
            currentCatalogPage = 1;
            renderGamesGrid();
        });
    });

    const menuToggle = document.getElementById("mobile-menu-toggle");
    const primaryNavigation = document.getElementById("primary-navigation");
    menuToggle?.addEventListener("click", () => {
        const isOpen = primaryNavigation?.classList.toggle("is-open") || false;
        menuToggle.setAttribute("aria-expanded", String(isOpen));
        menuToggle.setAttribute("aria-label", isOpen ? "Đóng trình đơn" : "Mở trình đơn");
        menuToggle.innerHTML = `<i class="fa-solid ${isOpen ? "fa-xmark" : "fa-bars"}"></i>`;
    });

    const userWidget = document.getElementById("user-profile-widget");
    const toggleUserMenu = () => userWidget?.classList.toggle("menu-open");
    userWidget?.addEventListener("click", (e) => {
        if (!e.target.closest(".dd-item")) toggleUserMenu();
    });
    userWidget?.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleUserMenu();
        }
    });

    const availabilitySelect = document.getElementById("availability-filter");
    availabilitySelect?.addEventListener("change", (e) => {
        currentAvailability = e.target.value;
        currentCatalogPage = 1;
        renderGamesGrid();
    });

    // 7. Sort Dropdown
    const sortSelect = document.getElementById("sort-select");
    sortSelect.addEventListener("change", (e) => {
        currentSort = e.target.value;
        currentCatalogPage = 1;
        renderGamesGrid();
    });

    document.getElementById("clear-filters-btn")?.addEventListener("click", resetCatalogFilters);

    document.getElementById("catalog-pagination")?.addEventListener("click", (e) => {
        const button = e.target.closest("[data-catalog-page]");
        if (!button || button.disabled) return;
        const requestedPage = Number(button.dataset.catalogPage);
        if (!Number.isInteger(requestedPage) || requestedPage < 1) return;
        currentCatalogPage = requestedPage;
        renderGamesGrid();
        document.getElementById("catalog-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    // 8. Dynamic delegation for Game Cards (Detail Button)
    document.getElementById("games-grid-container").addEventListener("click", (e) => {
        const detailBtn = e.target.closest(".card-detail-btn");
        const coverEl = e.target.closest(".card-header-img");
        const btnEl = e.target.closest(".card-btn");
        const resetBtn = e.target.closest(".empty-reset-btn");

        if (resetBtn) {
            resetCatalogFilters();
        } else if (detailBtn) {
            const gameId = detailBtn.getAttribute("data-game-id");
            openGameDetails(gameId);
        } else if (coverEl) {
            const gameId = coverEl.getAttribute("data-game-id");
            openGameDetails(gameId);
        } else if (btnEl) {
            const gameId = btnEl.getAttribute("data-game-id");
            const game = gamesDatabase.find(g => g.id === gameId);
            if (game) {
                const releaseState = getGameReleaseState(game);
                if (!releaseState.actionable) {
                    openGameDetails(game.id);
                    return;
                }
                const isOwned = userState.ownedGames.includes(game.id);
                if (isOwned) {
                    startPatchDownload(game);
                } else if (game.price === 0) {
                    unlockFreeGame(game);
                } else {
                    openCheckout(game.id);
                }
            }
        }
    });
    
    // Carousel slider details action delegation
    document.getElementById("hero-slider-container").addEventListener("click", (e) => {
        const btn = e.target.closest(".btn-detail");
        if (btn) {
            const gameId = btn.getAttribute("data-game-id");
            openGameDetails(gameId);
        }
    });

    // Slider Prev/Next Controls
    const prevBtn = document.querySelector(".carousel-nav .prev");
    const nextBtn = document.querySelector(".carousel-nav .next");
    const heroCarousel = document.querySelector(".hero-carousel");
    const heroDots = document.getElementById("carousel-dots-container");
    if (prevBtn && nextBtn) {
        prevBtn.addEventListener("click", () => {
            let prevIndex = activeHeroSlide - 1;
            const slides = document.querySelectorAll(".hero-slide");
            if (prevIndex < 0) prevIndex = slides.length - 1;
            goToSlide(prevIndex);
            startHeroRotation();
        });
        
        nextBtn.addEventListener("click", () => {
            let nextIndex = activeHeroSlide + 1;
            const slides = document.querySelectorAll(".hero-slide");
            if (nextIndex >= slides.length) nextIndex = 0;
            goToSlide(nextIndex);
            startHeroRotation();
        });
    }
    heroDots?.addEventListener("click", (event) => {
        const dot = event.target.closest("[data-hero-slide]");
        if (!dot) return;
        goToSlide(Number(dot.dataset.heroSlide) || 0);
        startHeroRotation();
    });
    heroCarousel?.addEventListener("mouseenter", stopHeroRotation);
    heroCarousel?.addEventListener("mouseleave", startHeroRotation);
    
    // 9. Close Detail Panel Panel
    document.getElementById("close-detail-btn").addEventListener("click", closeGameDetails);
    document.getElementById("detail-screenshots-container").addEventListener("click", (e) => {
        const button = e.target.closest(".screenshot-zoom-btn");
        if (!button) return;
        openImageLightbox(button.dataset.imageSrc, button.dataset.imageTitle || "Ảnh bản dịch Việt hóa");
    });

    document.getElementById("image-lightbox-close").addEventListener("click", closeImageLightbox);
    document.getElementById("image-lightbox").addEventListener("click", (e) => {
        if (e.target.id === "image-lightbox") closeImageLightbox();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            if (document.getElementById("image-lightbox")?.classList.contains("active")) {
                closeImageLightbox();
            } else if (document.getElementById("detail-overlay")?.classList.contains("active")) {
                closeGameDetails();
            } else if (document.getElementById("transaction-modal")?.classList.contains("active")) {
                closeTransactionModal();
            } else if (document.getElementById("deposit-modal")?.classList.contains("active")) {
                closeDepositModal();
            } else if (document.getElementById("auth-modal")?.classList.contains("active")) {
                closeAuthModal();
            }
        }
    });
    
    // 10. Auth Modal trigger and Forms handlers
    const authActionBtn = document.getElementById("auth-action-btn");
    authActionBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        if (userState.loggedIn) {
            await handleLogout();
        } else {
            openAuthModal();
        }
    });
    
    document.getElementById("close-auth-btn").addEventListener("click", closeAuthModal);
    
    // Auth Modal Tabs
    const tabLoginBtn = document.getElementById("tab-login-btn");
    const tabRegisterBtn = document.getElementById("tab-register-btn");
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    
    tabLoginBtn.addEventListener("click", () => {
        tabLoginBtn.classList.add("active");
        tabRegisterBtn.classList.remove("active");
        loginForm.classList.add("active");
        registerForm.classList.remove("active");
        void ensureTurnstileWidget("login");
    });
    
    tabRegisterBtn.addEventListener("click", () => {
        tabRegisterBtn.classList.add("active");
        tabLoginBtn.classList.remove("active");
        registerForm.classList.add("active");
        loginForm.classList.remove("active");
        void ensureTurnstileWidget("register");
    });

    document.getElementById("google-auth-btn")?.addEventListener("click", () => {
        window.location.assign("/api/vietpatch/auth/google-start?returnTo=%2F");
    });
    
    // Login form submission
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("login-email").value;
        const pass = document.getElementById("login-pass").value;
        const turnstileToken = currentTurnstileToken("login");
        if (authSecurityConfig.turnstile.enabled && !turnstileToken) {
            showToast("Vui lòng hoàn tất bước xác minh chống bot.", "error");
            await ensureTurnstileWidget("login");
            return;
        }
        await handleLogin(email, pass, turnstileToken);
    });
    
    // Register form submission
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = document.getElementById("reg-username").value;
        const email = document.getElementById("reg-email").value;
        const pass = document.getElementById("reg-pass").value;
        const turnstileToken = currentTurnstileToken("register");
        if (authSecurityConfig.turnstile.enabled && !turnstileToken) {
            showToast("Vui lòng hoàn tất bước xác minh chống bot.", "error");
            await ensureTurnstileWidget("register");
            return;
        }
        await handleRegister(username, email, pass, turnstileToken);
    });
    
    // 11. Deposit Modal Triggers
    document.getElementById("btn-open-deposit").addEventListener("click", (e) => {
        e.preventDefault();
        openDepositModal();
    });
    document.getElementById("close-deposit-btn").addEventListener("click", closeDepositModal);
    
    // Deposit preset values selector
    const presetBtns = document.querySelectorAll(".preset-btn");
    const customAmountInput = document.getElementById("deposit-custom-amount");
    presetBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            presetBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            customAmountInput.value = btn.getAttribute("data-value");
        });
    });
    
    customAmountInput.addEventListener("input", () => {
        presetBtns.forEach(b => b.classList.remove("active"));
    });
    
    // Payment method selector
    const methodItems = document.querySelectorAll(".payment-method-item");
    let selectedMethod = "vietqr";
    methodItems.forEach(item => {
        item.addEventListener("click", () => {
            methodItems.forEach(i => i.classList.remove("active"));
            item.classList.add("active");
            selectedMethod = item.getAttribute("data-method");
        });
    });
    
    // Deposit submit
    document.getElementById("deposit-submit-btn").addEventListener("click", () => {
        const amount = parseInt(customAmountInput.value);
        if (isNaN(amount) || amount < 10000) {
            showToast("Vui lòng nhập tối thiểu 10.000đ", "error");
            return;
        }
        closeDepositModal();
        openDepositCheckout(amount, selectedMethod);
    });
    
    // 12. Transaction Modal Verification Action
    document.getElementById("btn-verify-payment").addEventListener("click", processPaymentVerification);
    document.getElementById("close-trans-btn").addEventListener("click", closeTransactionModal);
    document.getElementById("btn-success-close").addEventListener("click", closeTransactionModal);
    
    // 13. FAQ accordion toggles
    document.querySelectorAll(".faq-question").forEach(q => {
        q.addEventListener("click", () => {
            const item = q.parentElement;
            item.classList.toggle("active");
        });
    });
    
    // 14. Translation Request Submission
    const reqForm = document.getElementById("req-form");
    if (reqForm) {
        reqForm.addEventListener("submit", (e) => {
            e.preventDefault();
            
            const title = document.getElementById("req-title").value;
            const engine = document.getElementById("req-engine").value;
            const platform = document.getElementById("req-platform").value;
            const link = document.getElementById("req-link").value;
            const logo = document.getElementById("req-logo").value;
            const notes = document.getElementById("req-notes").value;
            const safeLogo = window.VietPatchCMS?.safeAssetUrl(logo) || "";
            const safeLink = window.VietPatchCMS?.safeUrl(link) || "";

            if (logo.trim() && !safeLogo) {
                showToast("Link logo/ảnh game chưa hợp lệ.", "error");
                return;
            }

            if (link.trim() && !safeLink) {
                showToast("Đường dẫn cửa hàng chưa hợp lệ.", "error");
                return;
            }
            
            const newRequest = {
                id: window.VietPatchCMS?.createId("request") || `request-${Date.now()}`,
                title: title,
                logoUrl: safeLogo,
                engine: engine,
                platform: platform,
                link: safeLink,
                notes: notes,
                votes: 1,
                voted: true,
                published: true,
                userCreated: true
            };
            
            requestsList.unshift(newRequest);
            saveCommunityRequests();

            requestQuery = "";
            const requestSearch = document.getElementById("request-search");
            if (requestSearch) requestSearch.value = "";
            
            showToast(`Đã gửi yêu cầu dịch game ${title} thành công!`, "success");
            reqForm.reset();
            renderRequestsList();
        });
    }

    const requestSearch = document.getElementById("request-search");
    requestSearch?.addEventListener("input", event => {
        requestQuery = event.target.value || "";
        renderRequestsList();
    });
    
    // 15. Empty Library action button
    document.getElementById("library-go-home").addEventListener("click", () => {
        switchTab("home");
    });

    // 16. Profile action buttons
    const profileContent = document.getElementById("profile-content");
    if (profileContent) {
        profileContent.addEventListener("click", (e) => {
            if (e.target.closest(".profile-login-btn")) {
                openAuthModal();
            }
            if (e.target.closest(".profile-deposit-btn")) {
                openDepositModal();
            }
            if (e.target.closest(".profile-library-btn")) {
                switchTab("library");
            }
        });
    }
    
    // 17. Intersection Observer for Scroll Animations
    initScrollAnimations();
    initCounterAnimations();
});

window.addEventListener("storage", event => {
    if (event.key === window.VietPatchCMS?.STORAGE_KEY) {
        window.location.reload();
    }
});

function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                // Optional: stop observing once visible
                // observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    });

    document.querySelectorAll('.fade-in-section').forEach(section => {
        observer.observe(section);
    });
}

function initCounterAnimations() {
    const statNumbers = document.querySelectorAll('.stat-number');
    let hasAnimated = false;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !hasAnimated) {
                hasAnimated = true;
                statNumbers.forEach(stat => {
                    const originalText = stat.innerText;
                    // Only animate if it starts with a number
                    if (!/^\d/.test(originalText)) return;
                    
                    const isPlus = originalText.includes('+');
                    const isK = originalText.includes('K');
                    
                    // Extract numeric part
                    const targetNum = parseInt(originalText.replace(/\D/g, ''));
                    if (isNaN(targetNum)) return;
                    
                    let startNum = 0;
                    const duration = 2000;
                    const startTime = performance.now();
                    
                    function updateCounter(currentTime) {
                        const elapsed = currentTime - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        
                        // Ease out cubic
                        const easeProgress = 1 - Math.pow(1 - progress, 3);
                        const currentVal = Math.floor(easeProgress * targetNum);
                        
                        stat.innerText = currentVal + (isK ? 'K' : '') + (isPlus ? '+' : '');
                        
                        if (progress < 1) {
                            requestAnimationFrame(updateCounter);
                        } else {
                            stat.innerText = originalText; // Ensure exact final value
                        }
                    }
                    
                    requestAnimationFrame(updateCounter);
                });
            }
        });
    }, { threshold: 0.5 });
    
    const statsBar = document.querySelector('.stats-bar');
    if (statsBar) observer.observe(statsBar);
}
