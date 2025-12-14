module.exports = {
    // Informasi Bot
    botName: "𝗟𝗜𝗩𝗜𝗔𝗔 𝗕𝗢𝗧",
    version: "𝘃𝟭.𝟬.𝟬",
    ownerNumber: "6281234567890", // Ganti dengan nomor owner
    ownerName: "𝗟𝗜𝗩𝗜𝗔𝗔 𝗜𝗗",
    
    // Pengaturan Bot
    prefix: ".",
    sessionName: "liviaa-session",
    mode: "public", // 'public' atau 'self'
    
    // Pengaturan Grup
    welcomeEnabled: true,
    antilinkEnabled: true,
    antibadwordEnabled: false,
    
    // Pesan Custom
    welcomeMessage: "🌸 Selamat datang di @group ✨\nKami senang kamu bergabung di sini 🌷",
    goodbyeMessage: "😢 Sampai jumpa lagi @user!",
    
    // Database (jika menggunakan)
    database: {
        enabled: false,
        url: "mongodb://localhost:27017/liviaa-bot"
    }
};
