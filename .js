const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SB_URL, process.env.SB_KEY, {
  auth: { persistSession: false },
});
const port = process.env.PORT || 3000;
const Botly = require("botly");
const botly = new Botly({
  accessToken: process.env.PAGE_ACCESS_TOKEN,
  notificationType: Botly.CONST.REGULAR,
  FB_URL: "https://graph.facebook.com/v2.6/",
});
app.get("/", function (_req, res) {
  res.sendStatus(200);
});
/* ----- ESSENTIALS ----- */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

/* ----- MAGIC ----- */
app.post("/webhook", (req, res) => {
  // console.log(req.body)
  if (req.body.message) {
    onMessage(req.body.message.sender.id, req.body.message);
  } else if (req.body.postback) {
    onPostBack(
      req.body.postback.message.sender.id,
      req.body.postback.message,
      req.body.postback.postback
    );
  }
  res.sendStatus(200);
});
/* ----- DB Qrs ----- */
async function createUser(user) {
  const { data, error } = await supabase.from("users").insert([user]);

  if (error) {
    throw new Error("Error creating user : ", error);
  } else {
    return data;
  }
}

async function updateUser(id, update) {
  const { data, error } = await supabase
    .from("users")
    .update(update)
    .eq("uid", id);

  if (error) {
    throw new Error("Error updating user : ", error);
  } else {
    return data;
  }
}

async function userDb(userId) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("uid", userId);

  if (error) {
    console.error("Error checking user:", error);
  } else {
    return data;
  }
}

async function getHot() {
  const { data, error } = await supabase
    .from("users")
    .select("mid")
    .neq("mid", null)

  if (error) {
    console.error("Error checking user:", error);
  } else {
    return data;
  }
}
/* ----- HANDELS ----- */

const onMessage = async (senderId, message) => {
  const user = await userDb(senderId);
  const iterations = 5;
  const timer = (ms) => new Promise((res) => setTimeout(res, ms));
  if (message.message.text) {
    if (user[0]) {
      if(message.message.text.length <= 3 && !isNaN(message.message.text)) {
        var poz = parseInt(message.message.text);
        if(user[0].mode == "chapter") {
          var manga = await axios.get(`https://mslayed.onrender.com/manga/${user[0].mid}`);
          if (poz == "0" || poz == "00" || poz == "000") {
            botly.sendText({id: senderId,text: "الله عليك :) حاسب نـفسك أذكــى من المبرمج ؟"});
          } else if (poz > manga.data.total) {
            botly.sendText({id: senderId,text: `خطأ ⛔\nهناك (${manga.data.total}) فصل و انت إخترت (${poz}).\nالرجاء إختيار فصل موجود 😴.`});
          } else {
            await updateUser(senderId, {mode: "read", chapter: manga.data.data[manga.data.total - poz].chapter_id, cp: manga.data.total - poz, ep: "1"})
            .then(async (data, error) => { if (error) { botly.sendButtons({id: senderId, text: "حدث خطأ 4️⃣0️⃣4️⃣\nراسل المطور 💬 للإبلاغ عن المشكلة 😰",
          buttons: [
            botly.createWebURLButton("حساب المطور 💻👤", "facebook.com/0xNoti/")
          ]
        });}
            var chapter = await axios.get(`https://mslayed.onrender.com/chapter/${manga.data.data[manga.data.total - poz].chapter_id}`);
            botly.sendText({id: senderId,text: `‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ~ ${manga.data.data[manga.data.total - poz].chapter_name} ~
---------------< 1/${chapter.data.total} >---------------
     `}, async () => {
              botly.sendAttachment({
          id: senderId,
          type: Botly.CONST.ATTACHMENT_TYPE.IMAGE,
          payload: {
            url: chapter.data.data[0].page_image_url,
          },
          quick_replies: [
            {
              content_type: "text",
              title: "التالي ◀️",
              payload: manga.data.data[manga.data.total - poz].chapter_id,
            },
            {
              content_type: "text",
              title: "العودة للفصول 🔙",
              payload: "backcp",
            }
          ]
        });
      });
          });
        }
      } else if (user[0].mode == "read") {
        var epo = await axios.get(`https://mslayed.onrender.com/chapter/${user[0].chapter}`);
        var mipoz = await axios.get(`https://mslayed.onrender.com/manga/${user[0].mid}`);
        if (poz == "0" || poz == "00" || poz == "000") {
          botly.sendText({id: senderId,text: "الله عليك :) حاسب نـفسك أذكــى من المبرمج ؟"});
        } else if (poz > epo.data.total) {
          botly.send({
            id: senderId,
            message: {
              text: `أنت في الفصل (${mipoz.data.total - user[0].cp}) 📜\nالفصل فيه (- ${epo.data.total} -) صورة 🖼️\nإختر واحدة موجودة 😅`,
              quick_replies: [
                {
                  content_type: "text",
                  title: "العودة للفصول 🔙",
                  payload: "backcp",
                }
              ]
            },
          });
        } else {
          await updateUser(senderId, { ep: poz })
          .then(async (data, error) => { if (error) { botly.sendButtons({id: senderId, text: "حدث خطأ 4️⃣0️⃣4️⃣\nراسل المطور 💬 للإبلاغ عن المشكلة 😰",
          buttons: [
            botly.createWebURLButton("حساب المطور 💻👤", "facebook.com/0xNoti/")
          ]
        });}
        if(poz == epo.data.total) {
          botly.sendText({id: senderId,text: `---------------< ${poz}/${epo.data.total} >---------------`}, async () => {
            botly.sendAttachment({
              id: senderId,
              type: Botly.CONST.ATTACHMENT_TYPE.IMAGE,
              payload: {
                url: epo.data.data[poz - 1].page_image_url,
              },
              quick_replies: [
                {
                  content_type: "text",
                  title: "الفصل التالي ⏪",
                  payload: user[0].mid
                }
              ]
            });
          });
        } else {
          botly.sendText({id: senderId,text: `---------------< ${poz}/${epo.data.total} >---------------`}, async () => {
            botly.sendAttachment({
              id: senderId,
              type: Botly.CONST.ATTACHMENT_TYPE.IMAGE,
              payload: {
                url: epo.data.data[poz - 1].page_image_url,
              },
              quick_replies: [
                {
                  content_type: "text",
                  title: "التالي ◀️",
                  payload: user[0].chapter,
                },
                {
                  content_type: "text",
                  title: "العودة للفصول 🔙",
                  payload: "backcp",
                }
              ]
            });
          });
        }
        })
        }
      }
      } else {
        axios.get(`https://mslayed.onrender.com/search/${message.message.text}`)
        .then((response) => {
          if (response.data.total != 0) {
            if (response.data.total <= 10) {
              if (user[0].os == "lite") {
                response.data.data.slice(0, 4).forEach((x) => {
                  const contents = {
                    title: x.manga_name,
                    image_url: `https://mslayed.onrender.com/cover/fit?imageUrl=${x.manga_cover_image_url}`,
                    subtitle: x.manga_genres,
                    buttons: [
                      botly.createPostbackButton("قراءة المانغا 📖",`${x.manga_id}`),
                      botly.createPostbackButton("وصف المانغا ℹ️",`${x.manga_id}`),
                      botly.createPostbackButton("الاعدادات ⚙️", "setos")
                    ],
                  };
                  botly.sendGeneric({id: senderId, elements: contents, aspectRatio: Botly.CONST.IMAGE_ASPECT_RATIO.HORIZONTAL});
                });
              } else {
                list = [];
              response.data.data.forEach((x) => {
                const contents = {
                  title: x.manga_name,
                  image_url: `https://mslayed.onrender.com/cover/fit?imageUrl=${x.manga_cover_image_url}`,
                  subtitle: x.manga_genres,
                  buttons: [
                    botly.createPostbackButton("قراءة المانغا 📖",`${x.manga_id}`),
                    botly.createPostbackButton("وصف المانغا ℹ️",`${x.manga_id}`),
                    botly.createPostbackButton("الاعدادات ⚙️", "setos")
                  ],
                };
                list.push(contents);
              });
              botly.sendGeneric({id: senderId, elements: list, aspectRatio: Botly.CONST.IMAGE_ASPECT_RATIO.HORIZONTAL});
              }
            } else {
              if (user[0].os == "lite") {
                response.data.data.slice(0, 4).forEach((x) => {
                  const contents = {
                    title: x.manga_name,
                    image_url: `https://mslayed.onrender.com/cover/fit?imageUrl=${x.manga_cover_image_url}`,
                    subtitle: x.manga_genres,
                    buttons: [
                      botly.createPostbackButton("قراءة المانغا 📖",`${x.manga_id}`),
                      botly.createPostbackButton("وصف المانغا ℹ️",`${x.manga_id}`),
                      botly.createPostbackButton("الاعدادات ⚙️", "setos")
                    ],
                  };
                  botly.sendGeneric({ id: senderId, elements: contents, aspectRatio: Botly.CONST.IMAGE_ASPECT_RATIO.HORIZONTAL});
                });
              } else {
                list = [];
              response.data.data.slice(0, 9).forEach((x) => {
                const contents = {
                  title: x.manga_name,
                  image_url: `https://mslayed.onrender.com/cover/fit?imageUrl=${x.manga_cover_image_url}`,
                  subtitle: x.manga_genres,
                  buttons: [
                    botly.createPostbackButton("قراءة المانغا 📖",`${x.manga_id}`),
                    botly.createPostbackButton("وصف المانغا ℹ️",`${x.manga_id}`),
                    botly.createPostbackButton("الاعدادات ⚙️", "setos")
                  ],
                };
                list.push(contents);
              });
              botly.sendGeneric({
                id: senderId,
                elements: list,
                aspectRatio: Botly.CONST.IMAGE_ASPECT_RATIO.HORIZONTAL,
              });
              }
            }
          } else {
            botly.sendButtons({
              id: senderId,
              text: "لم أجد أي نتيجة بحث 😴.\nجرب كتابة جزء من إسم المانغا أو مشاهدة الرائج الان 📣",
              buttons: [
                botly.createPostbackButton("رائج الان 🔥", "hot")
              ]
            });
          }
        });
      }
    } else {
      await createUser({ uid: senderId, os: "messenger" })
      .then((data, error) => {
        botly.sendButtons({
          id: senderId,
          text: "📣 مرحبا بك 🥳\nكوميكسي أول صفحة تقدم المانغا و المانهوا على الماسنجر 💬.\nكل ماعليك هو البحث عن مانغا/مانهوا تعرفها أو يمكنك الضغط على (رائج الان 🔥)\nأكثر من 6000 مانغا/مانهوا بين يديك الأن.\n- إستمتع 💜",
          buttons: [
            botly.createPostbackButton("رائج الان 🔥", "hot"),
            botly.createPostbackButton("الاعدادات ⚙️", "setos"),
            botly.createWebURLButton("حساب المطور 💻👤", "facebook.com/0xNoti/")
          ]
        });
        }
      );
    }
  } else if (message.message.attachments[0].payload.sticker_id) {
    //botly.sendText({ id: senderId, text: "(Y)" });
  } else if (message.message.attachments[0].type == "image") {
    botly.sendText({ id: senderId, text: "0" });
  } else if (message.message.attachments[0].type == "audio") {
    botly.sendText({ id: senderId, text: "0" });
  } else if (message.message.attachments[0].type == "video") {
    botly.sendText({ id: senderId, text: "0" });
  }
};

/* ----- POSTBACK ----- */

const onPostBack = async (senderId, message, postback) => {
  const timer = (ms) => new Promise((res) => setTimeout(res, ms));
  const user = await userDb(senderId);
  const ep = parseInt(user[0].ep);
  const cp = parseInt(user[0].cp);
  const iterations = 5;
  if (message.postback) {
    if (postback == "hot") {
      const hot = await getHot();
      const arr = hot.map(obj => obj.mid);
      const counts = arr.reduce((counts, num) => { counts[num] = (counts[num] || 0) + 1; return counts;}, {});
      const countsArray = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      if (user[0].os == "lite") {
        countsArray.slice(0, 4).forEach(async (x) => {
          var info = await axios.get(`https://mslayed.onrender.com/details/${x[0]}`);
          const contents = {
            title: info.data.manga_name,
            image_url: `https://mslayed.onrender.com/cover/fit?imageUrl=${info.data.manga_cover_image_url}`,
            subtitle: info.data.manga_genres,
            buttons: [
              botly.createPostbackButton("قراءة المانغا 📖", info.data.manga_id),
              botly.createPostbackButton("وصف المانغا ℹ️", info.data.manga_id),
              botly.createPostbackButton("الاعدادات ⚙️", "setos")
            ]
          };
          botly.sendGeneric({
            id: senderId,
            elements: contents,
            aspectRatio: Botly.CONST.IMAGE_ASPECT_RATIO.HORIZONTAL
          });
        })
      } else {
        const list = await Promise.all(
          countsArray.slice(0, 9).map(async (x) => {
            var info = await axios.get(`https://mslayed.onrender.com/details/${x[0]}`);
            const contents = {
              title: info.data.manga_name,
              image_url: `https://mslayed.onrender.com/cover/fit?imageUrl=${info.data.manga_cover_image_url}`,
              subtitle: info.data.manga_genres,
              buttons: [
                botly.createPostbackButton("قراءة المانغا 📖", info.data.manga_id),
                botly.createPostbackButton("وصف المانغا ℹ️", info.data.manga_id),
                botly.createPostbackButton("الاعدادات ⚙️", "setos")
              ]
            };
            return contents;
          }));
          botly.sendGeneric({
            id: senderId,
            elements: list,
            aspectRatio: Botly.CONST.IMAGE_ASPECT_RATIO.HORIZONTAL
          });
      }
    } else if (postback == "setos") {
      botly.sendButtons({
              id: senderId,
              text: "إذا كنت تستخدم الفيسبوك لايت 😴 يرجى الضغط على الفيسبوك لايت! لتظهر لك نتائج أكثر ♾️",
              buttons: [
                botly.createPostbackButton("فيسبوك لايت ☑️", "lite"),
                botly.createPostbackButton("ماسنجر 💬", "messenger")
              ]
            });
    } else if (message.postback.title == "فيسبوك لايت ☑️" || message.postback.title == "ماسنجر 💬") {
      await updateUser(senderId, {os: postback})
            .then(async (data, error) => { if (error) { botly.sendButtons({id: senderId, text: "حدث خطأ 4️⃣0️⃣4️⃣\nراسل المطور 💬 للإبلاغ عن المشكلة 😰",
          buttons: [
            botly.createWebURLButton("حساب المطور 💻👤", "facebook.com/0xNoti/")
          ]
        });}
        botly.sendButtons({
          id: senderId,
          text: "تم تفعيل المنصة بنجاح 🫡☑️\nشاهد ماهو رائج الان ✨",
          buttons: [
            botly.createPostbackButton("رائج الان 🔥", "hot")
          ]
        });
          });
    } else if (message.postback.title == "قراءة المانغا 📖") {
      await updateUser(senderId, { mode: "chapter", mid: postback })
      .then(async (data, error) => {
          if (error) {
            botly.sendButtons({
              id: senderId,
              text: "حدث خطأ. راسل المطور لحل المشكلة في أقرب وقت",
              buttons: [
                botly.createWebURLButton(
                  "حساب المطور 💻👤",
                  "facebook.com/0xNoti/"
                ),
              ],
            });
          }
          var mread = await axios.get(`https://mslayed.onrender.com/manga/${postback}`);
          let btns = [];
          if (mread.data.total < 12) {
            mread.data.data.forEach((x, i) => {
              con = {
                content_type: "text",
                title: x.chapter_name,
                payload: `${x.chapter_id}-${x.chapter_number}-${mread.data.total}`,
              };
              btns.push(con);
            });
            botly.send({
              id: senderId,
              message: {
                text: "إختر واحد من الفصول 👇🏻🤗",
                quick_replies: btns,
              },
            });
          } else {
            botly.send({
              id: senderId,
              message: {
                text: `يوجد (${mread.data.total}) فصل 📜\nأكتب رقم فصل تريده و سأخذك مباشرة إليه ◀️😺`,
                quick_replies: [
                  {
                    content_type: "text",
                    title: "بدأ القراءة 📱",
                    payload: `${mread.data.data[mread.data.total - 1].chapter_id}-${postback}-${mread.data.total - 1}`,
                  },
                  {
                    content_type: "text",
                    title: mread.data.data[0].chapter_name,
                    payload: `${mread.data.data[0].chapter_id}-${mread.data.data[0].chapter_number}`,
                  }
                ]
              },
            });
          }
        }
      );
    } else if (message.postback.title == "وصف المانغا ℹ️") {
      var mread = await axios.get(`https://mslayed.onrender.com/manga/${postback}`);
      var info = await axios.get(`https://mslayed.onrender.com/details/${postback}`);
      botly.send({
        id: senderId,
        message: {
          text: `🔍 النوع : ${info.data.manga_genres}.\n🗓️ عام الصدور : ${info.data.manga_release_date}.\n♾️ الحالة : ${info.data.manga_status}.\n😐 الفئة : ${info.data.manga_age_rating}.\n💬 القصة :\n${info.data.manga_description}.`,
          quick_replies: [
            {
              content_type: "text",
              title: "بدأ القراءة 📱",
              payload: `${mread.data.data[mread.data.total - 1].chapter_id}-${postback}-${mread.data.total - 1}`,
            }
          ]
        },
      });
    }
  } else {
    if (message.message.text.startsWith("الفصل التالي ⏪")) {
      var nextCp = await axios.get(`https://mslayed.onrender.com/manga/${postback}`);
      if (nextCp.data.total == nextCp.data.data[cp].chapter_number) {
        botly.sendButtons({
          id: senderId,
          text: "إنتهت كل الفصول ☑️.\nإذا كنت مهتم يمكنك متابعة صانع الصفحة لمعرفة أي جديد 💬😺",
          buttons: [
            botly.createPostbackButton("رائج الان 🔥", "hot"),
            botly.createWebURLButton("حساب المطور 💻👤", "facebook.com/0xNoti/")
          ]
        });
      } else {
        await updateUser(senderId, {mode: "read", chapter: nextCp.data.data[cp - 1].chapter_id, cp: cp - 1, ep: "1"})
        .then(async (data, error) => { if (error) { botly.sendButtons({id: senderId, text: "حدث خطأ 4️⃣0️⃣4️⃣\nراسل المطور 💬 للإبلاغ عن المشكلة 😰",
          buttons: [
            botly.createWebURLButton("حساب المطور 💻👤", "facebook.com/0xNoti/")
          ]
        });} 
        var rnxtCp = await axios.get(`https://mslayed.onrender.com/chapter/${nextCp.data.data[cp - 1].chapter_id}`);
        botly.sendText({id: senderId,text: `‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ~ ${nextCp.data.data[cp - 1].chapter_name} ~
---------------< 1/${rnxtCp.data.total} >---------------
     `}, async () => {
          botly.sendAttachment({
            id: senderId,
            type: Botly.CONST.ATTACHMENT_TYPE.IMAGE,
            payload: {
              url: rnxtCp.data.data[0].page_image_url,
            },
            quick_replies: [
              {
                content_type: "text",
                title: "التالي ◀️",
                payload: nextCp.data.data[cp - 1].chapter_id,
              },
              {
                content_type: "text",
                title: "العودة للفصول 🔙",
                payload: "backcp",
              }
            ]
          });
        });
      })
      }
    } else if (message.message.text.startsWith("الفصل")) {
      const prts = postback.split("-");
      console.log(prts)
      await updateUser(senderId, {mode: "read", chapter: prts[0], cp: prts[1], ep: "1"})
      .then(async (data, error) => { if (error) { botly.sendButtons({id: senderId, text: "حدث خطأ 4️⃣0️⃣4️⃣\nراسل المطور 💬 للإبلاغ عن المشكلة 😰",
          buttons: [
            botly.createWebURLButton("حساب المطور 💻👤", "facebook.com/0xNoti/")
          ]
        });}
      var lnChap = await axios.get(`https://mslayed.onrender.com/chapter/${prts[0]}`);
      botly.sendText({id: senderId,text: `---------------< 1/${lnChap.data.total} >---------------`}, async () => {
        botly.sendAttachment({
          id: senderId,
          type: Botly.CONST.ATTACHMENT_TYPE.IMAGE,
          payload: {
            url: lnChap.data.data[0].page_image_url,
          },
          quick_replies: [
            {
              content_type: "text",
              title: "التالي ◀️",
              payload: prts[0],
            },
            {
              content_type: "text",
              title: "العودة للفصول 🔙",
              payload: "backcp",
            }
          ]
        });
      });
      });
    } else if (message.message.text.startsWith("التالي ◀️")) {
      var chapter = await axios.get(`https://mslayed.onrender.com/chapter/${postback}`);
      var chaplen = chapter.data.data.length;
      await updateUser(senderId, { ep: Math.min(ep + iterations, chapter.data.data.length) }).then(async (data, error) => {
        if (error) {botly.sendButtons({id: senderId, text: "حدث خطأ 4️⃣0️⃣4️⃣\nراسل المطور 💬 للإبلاغ عن المشكلة 😰",
          buttons: [ botly.createWebURLButton("حساب المطور 💻👤", "facebook.com/0xNoti/")]
        });}
        for (let i = ep; i < Math.min(ep + iterations, chapter.data.data.length); i++) {
          const isLastMonth = i === Math.min(ep + iterations - 1,  chapter.data.data.length - 1);
          if (chaplen == i + 1) {
            botly.sendAttachment({
              id: senderId,
              type: Botly.CONST.ATTACHMENT_TYPE.IMAGE,
              payload: {
                url: chapter.data.data[i].page_image_url,
              },
              quick_replies: [
                {
                  content_type: "text",
                  title: "الفصل التالي ⏪",
                  payload: user[0].mid,
                },
              ],
            }, async () => {
              if (isLastMonth) {
                botly.send({
                  id: senderId,
                  message: {
                    text: `---------------< ${i + 1}/${chapter.data.total} >---------------`,
                    quick_replies: [
                      {
                        content_type: "text",
                        title: "الفصل التالي ⏪",
                        payload: user[0].mid,
                      }
                    ]
                  },
                });
              }
            });
          } else {
            botly.sendAttachment({
              id: senderId,
              type: Botly.CONST.ATTACHMENT_TYPE.IMAGE,
              payload: {
                url: chapter.data.data[i].page_image_url,
              },
              quick_replies: [
                {
                  content_type: "text",
                  title: "التالي ◀️",
                  payload: postback,
                },
                {
                  content_type: "text",
                  title: "العودة للفصول 🔙",
                  payload: "backcp",
                }
              ]
            }, async () => {
              if (isLastMonth) {
                botly.send({
                  id: senderId,
                  message: {
                    text: `---------------< ${i + 1}/${chapter.data.total} >---------------`,
                    quick_replies: [
                      {
                        content_type: "text",
                        title: "التالي ◀️",
                        payload: postback,
                      },
                      {
                        content_type: "text",
                        title: "العودة للفصول 🔙",
                        payload: "backcp",
                      }
                    ]
                  },
                });
              }
            });
            await timer(1000);
          }
        }
      });
    } else if (message.message.text.startsWith("بدأ القراءة 📱")) {
      const prts = postback.split("-");
      await updateUser(senderId, {mode: "read", mid: prts[1], chapter: prts[0], cp: prts[2], ep: "1"})
            .then(async (data, error) => { if (error) { botly.sendButtons({id: senderId, text: "حدث خطأ 4️⃣0️⃣4️⃣\nراسل المطور 💬 للإبلاغ عن المشكلة 😰",
          buttons: [
            botly.createWebURLButton("حساب المطور 💻👤", "facebook.com/0xNoti/")
          ]
        });}
            var chapter = await axios.get(`https://mslayed.onrender.com/chapter/${prts[0]}`);
            botly.sendText({id: senderId,text: `---------------< 1/${chapter.data.total} >---------------`}, async () => {
              botly.sendAttachment({
          id: senderId,
          type: Botly.CONST.ATTACHMENT_TYPE.IMAGE,
          payload: {
            url: chapter.data.data[0].page_image_url,
          },
          quick_replies: [
            {
              content_type: "text",
              title: "التالي ◀️",
              payload: prts[0],
            },
            {
              content_type: "text",
              title: "العودة للفصول 🔙",
              payload: "backcp",
            }
          ]
        });
      });
          });
    } else if (postback == "backcp") {
      var seeChapters = await axios.get(`https://mslayed.onrender.com/manga/${user[0].mid}`);
      await updateUser(senderId, { mode: "chapter"})
      .then(async (data, error) => {
          if (error) {
            botly.sendButtons({
              id: senderId,
              text: "حدث خطأ. راسل المطور لحل المشكلة في أقرب وقت",
              buttons: [
                botly.createWebURLButton(
                  "حساب المطور 💻👤",
                  "facebook.com/0xNoti/"
                ),
              ],
            });
          }
        });
        if (seeChapters.data.total < 12) {
          seeChapters.data.data.forEach((x, i) => {
            con = {
              content_type: "text",
              title: x.chapter_name,
              payload: `${x.chapter_id}-${x.chapter_number}-${mread.data.total}`,
            };
            btns.push(con);
          });
          botly.send({
            id: senderId,
            message: {
              text: "إختر واحد من الفصول 👇🏻🤗",
              quick_replies: btns,
            },
          });
        } else {
          botly.send({
            id: senderId,
            message: {
              text: `حسنا ✅ الان تستطيع إختيار فصل.\nيوجد (${seeChapters.data.total}) فصل 📜\nأكتب رقم فصل تريده و سأخذك مباشرة إليه ◀️😺 أو إختر ماتريده 👇🏻`,
              quick_replies: [
                {
                  content_type: "text",
                  title: seeChapters.data.data[0].chapter_name,
                  payload: `${seeChapters.data.data[0].chapter_id}-${seeChapters.data.data[0].chapter_number}-${seeChapters.data.total}`,
                }
              ]
            },
          });
        }
    }
  }
};
/* ----- HANDELS ----- */
app.listen(port, () => console.log(`App is on port : ${port}`));
