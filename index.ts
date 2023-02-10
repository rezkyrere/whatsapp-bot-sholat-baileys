import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@adiwajshing/baileys'
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';
import { Boom } from '@hapi/boom'
import moment from 'moment-timezone';

async function connectToWhatsApp() {
    const {state, saveCreds} = await useMultiFileAuthState('auth')
    const sock = makeWASocket({
        // can provide additional config here
        printQRInTerminal: true,
        auth:state
    })
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect)
            // reconnect if not logged out
            if (shouldReconnect) {
                connectToWhatsApp()
            }
        } else if (connection === 'open') {
            console.log('opened connection')
        }
    })
    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.key.fromMe && m.type === 'notify') {
            if (msg.message?.locationMessage) {
                const latitude = msg.message?.locationMessage?.degreesLatitude;
                const longitude = msg.message?.locationMessage?.degreesLongitude;

                const coordinates = new Coordinates(latitude!, longitude!);
                const params = CalculationMethod.MoonsightingCommittee();
                const date = new Date();
                const prayerTimes = new PrayerTimes(coordinates, date, params);

                console.log(prayerTimes);
                await sock.sendMessage(msg.key.remoteJid!, { text: processData(prayerTimes)})
            } else {
                await sock.sendMessage(msg.key.remoteJid!, {text : `Asalamualaikum ini adalah BOT Waktu sholat. silahkan share lokasi anda`})
            }
            
        }
        // console.log('hahha', m.messages[0].key.remoteJid)
        // await sock.sendMessage(m.messages[0].key.remoteJid!, { text: 'Hello there!' })
    })
}
function processData(data: any)
{
    return `Waktu Sholat Hari ini \n\n Subuh : ${processTime(data.fajr)} \n Dzuhur : ${processTime(data.dhuhr)} \n Ashar : ${processTime(data.asr)} \n Magrib : ${processTime(data.maghrib)} \n Isha : ${processTime(data.isha)}`
}
function processTime(time: any)
{
    return moment(time).tz(' Asia/Makassar').format('HH:mm') + " WITA"
}
connectToWhatsApp()