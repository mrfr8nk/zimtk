const { setConfig, getConfig } = require('../lib/configdb');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const FormData = require('form-data');
const settings = require('../settings');

const channelInfo = {
    contextInfo: {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363401148284316@newsletter',
            newsletterName: 'Xhypher tech',
            serverMessageId: -1
        }
    }
};

async function setbotimageCommand(sock, chatId, senderId, message, userMessage) {
    try {
        if (!message.key.fromMe && !await isSudo(senderId)) {
            return sock.sendMessage(chatId, { text: '❗ Only the bot owner can use this command.', ...channelInfo }, { quoted: message });
        }

        const args = userMessage.split(/\s+/).slice(1);
        let imageUrl = args[0];

        if (!imageUrl && message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const quotedMsg = message.message.extendedTextMessage.contextInfo.quotedMessage;
            const mimeType = quotedMsg.imageMessage?.mimetype || '';
            
            if (!mimeType.startsWith("image")) {
                return sock.sendMessage(chatId, { text: '❌ Please reply to an image.', ...channelInfo }, { quoted: message });
            }

            const quotedMessage = {
                message: quotedMsg,
                key: {
                    remoteJid: chatId,
                    id: message.message.extendedTextMessage.contextInfo.stanzaId,
                    participant: message.message.extendedTextMessage.contextInfo.participant,
                    fromMe: false
                }
            };
            const mediaBuffer = await sock.downloadMediaMessage(quotedMessage);
            const extension = mimeType.includes("jpeg") ? ".jpg" : ".png";
            const tempFilePath = path.join(os.tmpdir(), `botimg_${Date.now()}${extension}`);
            fs.writeFileSync(tempFilePath, mediaBuffer);

            const form = new FormData();
            form.append("fileToUpload", fs.createReadStream(tempFilePath), `botimage${extension}`);
            form.append("reqtype", "fileupload");

            const response = await axios.post("https://catbox.moe/user/api.php", form, {
                headers: form.getHeaders()
            });

            fs.unlinkSync(tempFilePath);

            if (typeof response.data !== 'string' || !response.data.startsWith('https://')) {
                throw new Error(`Catbox upload failed: ${response.data}`);
            }

            imageUrl = response.data;
        }

        if (!imageUrl || !imageUrl.startsWith("http")) {
            return sock.sendMessage(chatId, { text: '❌ Provide a valid image URL or reply to an image.', ...channelInfo }, { quoted: message });
        }

        await setConfig("BOTIMAGE", imageUrl);
        await sock.sendMessage(chatId, { text: `✅ Bot image updated.\n\n*New URL:* ${imageUrl}`, ...channelInfo }, { quoted: message });

    } catch (err) {
        console.error(err);
        await sock.sendMessage(chatId, { text: `❌ Error: ${err.message || err}`, ...channelInfo }, { quoted: message });
    }
}

async function setbotnameCommand(sock, chatId, senderId, message, userMessage) {
    try {
        if (!message.key.fromMe && !await isSudo(senderId)) {
            return sock.sendMessage(chatId, { text: '❗ Only the bot owner can use this command.', ...channelInfo }, { quoted: message });
        }

        const args = userMessage.split(/\s+/).slice(1);
        const newName = args.join(" ").trim();
        
        if (!newName) {
            return sock.sendMessage(chatId, { text: '❌ Provide a bot name.', ...channelInfo }, { quoted: message });
        }

        await setConfig("BOTNAME", newName);
        await sock.sendMessage(chatId, { text: `✅ Bot name updated to: *${newName}*`, ...channelInfo }, { quoted: message });

    } catch (err) {
        console.error(err);
        await sock.sendMessage(chatId, { text: `❌ Error: ${err.message || err}`, ...channelInfo }, { quoted: message });
    }
}

async function setownernameCommand(sock, chatId, senderId, message, userMessage) {
    try {
        if (!message.key.fromMe && !await isSudo(senderId)) {
            return sock.sendMessage(chatId, { text: '❗ Only the bot owner can use this command.', ...channelInfo }, { quoted: message });
        }

        const args = userMessage.split(/\s+/).slice(1);
        const name = args.join(" ").trim();
        
        if (!name) {
            return sock.sendMessage(chatId, { text: '❌ Provide an owner name.', ...channelInfo }, { quoted: message });
        }

        await setConfig("OWNERNAME", name);
        await sock.sendMessage(chatId, { text: `✅ Owner name updated to: *${name}*`, ...channelInfo }, { quoted: message });

    } catch (err) {
        console.error(err);
        await sock.sendMessage(chatId, { text: `❌ Error: ${err.message || err}`, ...channelInfo }, { quoted: message });
    }
}

async function setvarCommand(sock, chatId, senderId, message, userMessage, prefix) {
    try {
        const getConfigValue = (key, defaultVal) => {
            const val = getConfig(key);
            return val !== null ? val : defaultVal;
        };

        const cmdList = `
    ----------------------------------------
    \`\`\`PRETTY MD SETTINGS\`\`\`
    -----------------------------------------
    
🔧 *1. \`Mode\`*
   - Current Status: ${getConfigValue('MODE', settings.commandMode || 'public')}
   - Usage: ${prefix}mode private/public

🎯 *2. \`Auto Typing\`*
   - Current Status: ${getConfigValue('AUTOTYPING', 'off')}
   - Usage: ${prefix}autotyping on/off

🌐 *3. \`Always Online\`*
   - Current Status: ${getConfigValue('ALWAYSONLINE', 'off')}
   - Usage: ${prefix}alwaysonline on/off

🎙️ *4. \`Auto Recording\`*
   - Current Status: ${getConfigValue('AUTORECORDING', 'off')}
   - Usage: ${prefix}autorecording on/off

📖 *5. \`Auto Read Status\`*
   - Current Status: ${getConfigValue('AUTOSTATUSREACT', 'off')}
   - Usage: ${prefix}autostatusreact on/off

🚫 *6. \`Anti Bad Word\`*
   - Current Status: ${getConfigValue('ANTIBADWORD', 'off')}
   - Usage: ${prefix}antibad on/off

🗑️ *7. \`Anti Delete\`*
   - Current Status: ${getConfigValue('ANTIDELETE', 'off')}
   - Usage: ${prefix}antidelete on/off

🖼️ *8. \`Auto Sticker\`*
   - Current Status: ${getConfigValue('AUTOSTICKER', 'off')}
   - Usage: ${prefix}autosticker on/off

💬 *9. \`Auto Reply\`*
   - Current Status: ${getConfigValue('AUTOREPLY', 'off')}
   - Usage: ${prefix}autoreply on/off

❤️ *10. \`Auto React\`*
   - Current Status: ${getConfigValue('AUTOREACT', 'off')}
   - Usage: ${prefix}autoreact on/off

📢 *11. \`Status Reply\`*
   - Current Status: ${getConfigValue('AUTOSTATUSREPLY', 'off')}
   - Usage: ${prefix}autostatusreply on/off

🔗 *12. \`Anti Link\`*
   - Current Status: ${getConfigValue('ANTILINK', 'off')}
   - Usage: ${prefix}antilink on/off

🤖 *13. \`Anti Bot\`*
   - Current Status: ${getConfigValue('ANTIBOT', 'off')}
   - Usage: ${prefix}antibot off/warn/delete/kick

💖 *14. \`Heart React\`*
   - Current Status: ${getConfigValue('HEARTREACT', 'off')}
   - Usage: ${prefix}heartreact on/off

🔧 *15. \`Set Prefix\`*
   - Current Prefix: ${prefix}
   - Usage: ${prefix}setprefix <new_prefix>

📌 *Note*: Replace \`"on/off"\` with the desired state to enable or disable a feature.
`;

        try {
            await sock.sendMessage(chatId, {
                image: { url: 'https://files.catbox.moe/18il7k.jpg' },
                caption: cmdList
            }, { quoted: message });
        } catch (e) {
            await sock.sendMessage(chatId, { text: cmdList, ...channelInfo }, { quoted: message });
        }

    } catch (err) {
        console.error(err);
        await sock.sendMessage(chatId, { text: `❌ Error: ${err.message || err}`, ...channelInfo }, { quoted: message });
    }
}

async function modeCommand(sock, chatId, senderId, message, userMessage, prefix) {
    try {
        if (!message.key.fromMe && !await isSudo(senderId)) {
            return sock.sendMessage(chatId, { text: '*📛 Only the owner can use this command!*', ...channelInfo }, { quoted: message });
        }

        const args = userMessage.split(/\s+/).slice(1);
        const currentMode = getConfig('MODE') || settings.commandMode || 'public';

        if (!args[0]) {
            return sock.sendMessage(chatId, { text: `📌 Current mode: *${currentMode}*\n\nUsage: ${prefix}mode private OR ${prefix}mode public`, ...channelInfo }, { quoted: message });
        }

        const modeArg = args[0].toLowerCase();

        if (['private', 'public'].includes(modeArg)) {
            await setConfig('MODE', modeArg);
            await sock.sendMessage(chatId, { text: `✅ Bot mode is now set to *${modeArg.toUpperCase()}*.`, ...channelInfo }, { quoted: message });
        } else {
            return sock.sendMessage(chatId, { text: `❌ Invalid mode. Please use \`${prefix}mode private\` or \`${prefix}mode public\`.`, ...channelInfo }, { quoted: message });
        }

    } catch (err) {
        console.error(err);
        await sock.sendMessage(chatId, { text: `❌ Error: ${err.message || err}`, ...channelInfo }, { quoted: message });
    }
}

async function toggleSettingCommand(sock, chatId, senderId, message, settingKey, settingName, prefix, commandName) {
    try {
        if (!message.key.fromMe && !await isSudo(senderId)) {
            return sock.sendMessage(chatId, { text: '*📛 Only the owner can use this command!*', ...channelInfo }, { quoted: message });
        }

        const userMessage = (message.message?.conversation || message.message?.extendedTextMessage?.text || '').toLowerCase().trim();
        const args = userMessage.split(/\s+/).slice(1);
        const status = args[0]?.toLowerCase();

        if (!['on', 'off'].includes(status)) {
            return sock.sendMessage(chatId, { text: `*Example: ${prefix}${commandName} on/off*`, ...channelInfo }, { quoted: message });
        }

        await setConfig(settingKey, status === 'on' ? 'true' : 'false');
        return sock.sendMessage(chatId, { text: `✅ ${settingName} has been turned ${status}.`, ...channelInfo }, { quoted: message });

    } catch (err) {
        console.error(err);
        await sock.sendMessage(chatId, { text: `❌ Error: ${err.message || err}`, ...channelInfo }, { quoted: message });
    }
}

async function isSudo(senderId) {
    const { isSudo: checkSudo } = require('../lib/index');
    return await checkSudo(senderId);
}

module.exports = {
    setbotimageCommand,
    setbotnameCommand,
    setownernameCommand,
    setvarCommand,
    modeCommand,
    toggleSettingCommand
};
