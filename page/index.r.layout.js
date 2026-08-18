import { px } from '@zos/utils'
import { createWidget, deleteWidget, widget, align, prop, text_style, event, getTextLayout, anim_status} from '@zos/ui'
import { setPageBrightTime, getBrightness, getAutoBrightness } from '@zos/display'
import { setScrollMode, setScrollLock, SCROLL_MODE_SWIPER } from '@zos/page'
import { getDeviceInfo, getDiskInfo } from '@zos/device'
import { getPerformance, getPackageInfo } from '@zos/app'
import { getSystemInfo, getSystemMode } from '@zos/settings'
import { Battery } from '@zos/sensor'
import { showToast, createModal } from '@zos/interaction'
import { getText } from '@zos/i18n'
import { getLogger } from '../utils/logger.js'
import { kb_lowercase, kb_uppercase, kb_numbers, kb_symbols, KEY_SYMB, KEY_NUM, KEY_ABC, KEY_abc, KEY_SEND, KEY_CANCEL, KEY_BACKSPACE } from 'zosLoader:./keyboard.[pf].layout.js'
import { isSystemKeyboardAvailable, openSystemKeyboard } from '../utils/keyboard.js'
import { BTN_PADDING, ROW_PADDING, BTN_RADIUS, btnPressColor, COLOR_BLACK, COLOR_GRAY_TOAST, COLOR_GRAY, COLOR_RED, COLOR_WHITE, CUSTOM_TOAST, SYSTEM_TOAST, SYSTEM_MODAL, NO_NOTIFICATION, SHOW_IMAGE, KB_TYPE_CHAR, KB_TYPE_NUMERIC } from '../utils/constants.js';

const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT } = getDeviceInfo();
const TEXT_SIZE = DEVICE_WIDTH / 16;

const NOTIFICATION_X = 60
const NOTIFICATION_Y = 350
const NOTIFICATION_WIDTH = DEVICE_WIDTH - (NOTIFICATION_X * 2)
const NOTIFICATION_H_MIN = 40
const NOTIFICATION_TEXT_SIZE = 32

const logger = getLogger('http-buttons-layout')

function formatStorageSize(bytes) {
  const n = Number(bytes) || 0
  if (n >= 1000000000) return (n / 1000000000).toFixed(2) + ' GB'
  if (n >= 1000000) return Math.round(n / 1000000) + ' MB'
  if (n >= 1000) return Math.round(n / 1000) + ' KB'
  return Math.round(n) + ' B'
}

function getRamInfoText() {
  const sysInfo = getSystemInfo() || {}
  const apiLevel = parseFloat(sysInfo.minAPI || '0')

  if (!isFinite(apiLevel) || apiLevel < 4) {
    return [
      '🧠 RAM',
      'Non disponibile',
      'Richiede API 4.0+',
      'API: ' + (sysInfo.minAPI || 'n/d')
    ].join('\n')
  }

  const profile = getPerformance('memory')
  const memory = (profile && profile.memory) || {}
  const system = memory.system || {}

  const total = Number(system.total) || 0
  const used = Number(system.used) || 0
  const free = Math.max(0, total - used)
  const usedPct = total > 0 ? Math.round((used / total) * 100) : 0

  const pkg = getPackageInfo() || {}
  const appId = Number(pkg.appId)

  const apps = Array.isArray(memory.app) ? memory.app : []
  const ownApp = apps.find((item) => Number(item.appid) === appId)

  const leaks = Array.isArray(memory.leaking) ? memory.leaking : []
  const ownLeakBytes = leaks
    .filter((item) => Number(item.appid) === appId)
    .reduce((sum, item) => sum + (Number(item.used) || 0), 0)

  return [
    '🧠 RAM',
    'Sistema: ' + formatStorageSize(used) + ' / ' + formatStorageSize(total),
    'Libera: ' + formatStorageSize(free),
    'Uso: ' + usedPct + '%',
    'HTTP-B: ' + (ownApp ? formatStorageSize(ownApp.used) : 'n/d'),
    'Picco: ' + (ownApp ? formatStorageSize(ownApp.peak) : 'n/d'),
    'Leak: ' + formatStorageSize(ownLeakBytes)
  ].join('\n')
}

function getSystemDiagText() {
  const info = getSystemInfo() || {}
  const mode = getSystemMode() || {}
  const battery = new Battery()
  const batteryPct = battery.getCurrent()
  const brightness = getBrightness()
  const autoBrightness = getAutoBrightness()

  const activeModes = []

  if (mode.ultraPowerSaving) activeModes.push('ULTRA')
  else if (mode.powerSaving) activeModes.push('RISPARMIO')

  if (mode.DND) activeModes.push('DND')
  if (mode.sleep) activeModes.push('SONNO')
  if (mode.theater) activeModes.push('TEATRO')
  if (mode.systemLock) activeModes.push('LOCK')
  if (mode.lowTemperature) activeModes.push('BASSA T')

  const modeText = activeModes.length ? activeModes.join(' ') : 'Normale'

  return [
    '⚙️ SISTEMA',
    'Batteria: ' + batteryPct + '%',
    'Zepp OS: ' + (info.osVersion || 'n/d'),
    'Firmware: ' + (info.firmwareVersion || 'n/d'),
    'API: ' + (info.minAPI || 'n/d'),
    'Luce: ' + brightness + '% ' + (autoBrightness ? 'AUTO' : 'MAN'),
    'Modo: ' + modeText
  ].join('\n')
}

function getStorageInfoText() {
  const disk = getDiskInfo()

  // Memo WAV reale: PCM 16 bit, 16 kHz, mono = 256000 bit/s = 32000 byte/s
  const seconds = Math.floor((Number(disk.free) || 0) / 32000)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  return [
    '💾 MEMORIA',
    'Libera: ' + formatStorageSize(disk.free),
    'Totale: ' + formatStorageSize(disk.total),
    'App: ' + formatStorageSize(disk.app),
    'Quadranti: ' + formatStorageSize(disk.watchface),
    'Sistema: ' + formatStorageSize(disk.system),
    'Memo ≈ ' + hours + 'h ' + minutes + 'm'
  ].join('\n')
}

// Native pixel size of the loading anim PNGs (assets .../anim/loading*.png).
// It's the real asset size, so it is NOT scaled by px() — the anim is drawn at
// its intrinsic resolution; we only center it and place the caption beneath it.
const LOADING_ANIM_SIZE = 155;

export const LOADING_TEXT_WIDGET = {
  x: 0,
  y: (DEVICE_HEIGHT/2)+LOADING_ANIM_SIZE,
  w: DEVICE_WIDTH, h: TEXT_SIZE*1.5,
  text_size: TEXT_SIZE,
  color: COLOR_WHITE,
  align_h: align.CENTER_H,
  align_v: align.CENTER_V,
  text_style: text_style.WRAP,
  text: getText('loading')
};

export const LOADING_IMG_ANIM_WIDGET = {
    anim_path: 'anim',
    anim_prefix: 'loading',
    anim_ext: 'png',
    anim_fps: 24,
    anim_size: 54,
    repeat_count: 0,
    anim_status: anim_status.START,
    x: (DEVICE_WIDTH/2)-(LOADING_ANIM_SIZE/2), y: DEVICE_HEIGHT/2
  };

/**
 * Returns the appropriate keyboard layout based on keyboard_type
 * @param {number} keyboardType - The keyboard type constant
 * @returns {Array} The keyboard layout array
 */
function getInitialKeyboard(keyboardType) {
  switch (keyboardType) {
    case KB_TYPE_NUMERIC:
      return kb_numbers;
    case KB_TYPE_CHAR:
    default:
      return kb_lowercase;
  }
}

const SPINNER_SIZE = 28 // px; matches the assets/spinner frame size
const SPINNER_MARGIN = 4 // px of dark disc showing around the spinner on each side

// Small self-animating loading spinner shown in a corner of the pressed button
// while its request is in flight (assets/spinner/spin_*.png). The spinner PNGs
// are near-white, so a translucent dark disc is drawn behind them — otherwise
// the spinner is invisible on light buttons (yellow, gold, white, …).
function startButtonSpinner(x, y) {
  // A touch larger than the spinner (SPINNER_MARGIN per side) and centered on
  // it, so it reads as a soft badge behind the spokes rather than a hard ring.
  const bgSize = SPINNER_SIZE + SPINNER_MARGIN * 2
  const bg = createWidget(widget.FILL_RECT, {
    x: px(x - SPINNER_MARGIN), y: px(y - SPINNER_MARGIN),
    w: px(bgSize), h: px(bgSize),
    radius: px(bgSize / 2),
    color: COLOR_BLACK, alpha: 140,
  })
  const anim = createWidget(widget.IMG_ANIM, {
    anim_path: 'spinner',
    anim_prefix: 'spin',
    anim_ext: 'png',
    anim_fps: 12,
    anim_size: 10,
    repeat_count: 0,
    anim_status: anim_status.START,
    x: px(x), y: px(y),
  })
  return { bg, anim }
}
function stopButtonSpinner(h) {
  if (!h) return
  if (h.anim) { deleteWidget(h.anim) }
  if (h.bg) { deleteWidget(h.bg) }
}

export const layout = {
  refs: {},

  showStorageInfo(pageid) {
    try {
      this.notifyResult(getStorageInfoText(), pageid, false, CUSTOM_TOAST, false, true)
    } catch (e) {
      logger.error('storage info failed', e)
      this.notifyResult('Errore lettura memoria', pageid, true, CUSTOM_TOAST, false, true)
    }
  },

  showRamInfo(pageid) {
    try {
      this.notifyResult(getRamInfoText(), pageid, false, CUSTOM_TOAST, true, true)
    } catch (e) {
      logger.error('RAM info failed', e)
      this.notifyResult('Errore lettura RAM', pageid, true, CUSTOM_TOAST, true, true)
    }
  },
  showSystemDiag(pageid) {
    try {
      this.notifyResult(getSystemDiagText(), pageid, false, CUSTOM_TOAST, true, true)
    } catch (e) {
      logger.error('system diag failed', e)
      this.notifyResult('Errore diagnostica sistema', pageid, true, CUSTOM_TOAST, true, true)
    }
  },

  // Full-screen descriptive message for the error/empty states. For the
  // "no config at all" case it also offers a button to load the example config.
  renderMessage(vm, text, offerLoad) {
    createWidget(widget.TEXT, {
      x: px(20), y: 0,
      w: px(DEVICE_WIDTH - 40), h: offerLoad ? px(DEVICE_HEIGHT * 0.68) : DEVICE_HEIGHT,
      color: COLOR_WHITE, text_size: 30,
      align_h: align.CENTER_H, align_v: align.CENTER_V,
      text_style: text_style.WRAP, text: text
    })
    if (offerLoad) {
      const bw = DEVICE_WIDTH * 0.6, bh = 64
      createWidget(widget.BUTTON, {
        x: px((DEVICE_WIDTH - bw) / 2), y: px(DEVICE_HEIGHT * 0.72),
        w: px(bw), h: px(bh), radius: px(bh / 2),
        normal_color: COLOR_GRAY, press_color: btnPressColor(COLOR_GRAY, 1.3),
        color: COLOR_WHITE, text_size: TEXT_SIZE,
        text: getText('load_example'),
        click_func: () => vm.loadExampleConfig()
      })
    }
  },
  render(vm) {
    logger.debug(getText('loading'))
    // Distinct, descriptive states (never overwrite the user's config):
    // comms failure, no config at all (offers Load example), or invalid JSON.
    if (vm.state.isError) {
      this.renderMessage(vm, getText('comunication_error'), false)
      return;
    }
    if (!vm.state.data) {
      this.renderMessage(vm, getText('no_config'), true)
      return;
    }
    try {
      const parsed = JSON.parse(vm.state.data)
      if (!parsed || !parsed.pages) throw new Error('missing pages')
    } catch (e) {
      logger.error('config parse error', e)
      this.renderMessage(vm, getText('config_error'), false)
      return;
    }
    /* BUILD UI */
    logger.info(vm.state.data)
    let inputText = '';
    let currentKeyboard = null;
    let kbBackground = null;
    let currentLayoutIds = null;
    let data = JSON.parse(vm.state.data)

    // Indice zero-based della pagina Memoria; getSwiperIndex() invece conta da 1.
    vm.storagePageIndex = data.pages.length

    // Pagina locale dell'orologio: non modifica la configurazione CAMERA sul telefono.
    data.pages.push({
      title: '💾 Memoria',
      back_color: COLOR_BLACK,
      text_color: COLOR_WHITE,
      rows: [
        {
          h: 100,
          buttons: [
            {
              text: '💾 LEGGI MEMORIA',
              w: 100,
              radius: 18,
              back_color: COLOR_GRAY,
              text_color: COLOR_WHITE,
              local_action: 'storage_info'
            }
          ]
        }
      ]
    })

    // Terza pagina locale: diagnostica dello smartwatch.
    vm.systemPageIndex = data.pages.length
    data.pages.push({
      title: '🧰 Diagnostica',
      title_height: 90,
      back_color: COLOR_BLACK,
      text_color: COLOR_WHITE,
      rows: [
        {
          h: 50,
          buttons: [
            {
              text: '🧠 RAM',
              w: 100,
              radius: 18,
              back_color: COLOR_GRAY,
              text_color: COLOR_WHITE,
              local_action: 'ram_info'
            }
          ]
        },
        {
          h: 50,
          buttons: [
            {
              text: '⚙️ SISTEMA',
              w: 100,
              radius: 18,
              back_color: COLOR_GRAY,
              text_color: COLOR_WHITE,
              local_action: 'system_diag'
            }
          ]
        }
      ]
    })

    setPageBrightTime({ brightTime: 60000 })

    setScrollMode({
      mode: SCROLL_MODE_SWIPER,
      options: {
        height: DEVICE_HEIGHT,
        count: data.pages.length,
      },
    });

    createWidget(widget.PAGE_SCROLLBAR, {});

    for (let [pi, page] of data.pages.entries()) {
      logger.debug('new page id:', pi);

      let offsetYpage = (DEVICE_HEIGHT * pi);
      let titleHeight = 0;
      let paddingXbtn = page.button_padding || BTN_PADDING;
      let paddingYbtn = page.row_padding || ROW_PADDING;

      //logger.debug('offsetYpage:', offsetYpage);

      let pageBackground = createWidget(widget.FILL_RECT, {
        x: 0, y: px(offsetYpage), w: px(DEVICE_WIDTH), h: px(DEVICE_HEIGHT),
        color: page.back_color || COLOR_BLACK
      })

      if (page.title) {
        titleHeight = page.title_height || 50;
        let pageTitle = createWidget(widget.TEXT, {
          x: 0,
          y: px(offsetYpage),
          w: px(DEVICE_WIDTH),
          h: px(titleHeight),
          color: page.text_color || COLOR_WHITE,
          text: page.title,
          text_size: page.text_size || TEXT_SIZE,
          align_h: align.CENTER_H,
          align_v: align.CENTER_V,
          text_style: text_style.NONE
        });
      }

      // Make shure that the sum of rows h per page is 100 or less
      //if not, let's size them evenly
      let calcRowsPercHeigthIs100 = page.rows.reduce((n, { h }) => n + Number(h), 0);
      //logger.debug('calcRowsPercHeigthIs100:', calcRowsPercHeigthIs100);

      if (calcRowsPercHeigthIs100 > 100) {
        let heigthEqual = 100 / page.rows.length;
        page.rows.forEach((row) => {
          row.h = Math.round(heigthEqual * 100) / 100;
        })
      }

      let pageButtonSpaceH = DEVICE_HEIGHT - titleHeight

      for (let [ri, row] of page.rows.entries()) {
        logger.debug('new row id:', ri);

        let perchbefore = 0;

        page.rows.slice(0, ri).forEach((r) => {
          perchbefore += Number(r.h);
        })
        //logger.debug('perchbefore:', perchbefore);

        let sumhbefore = pageButtonSpaceH * perchbefore / 100;
        //logger.debug('sumhbefore:', sumhbefore);

        let startYforThisBtn = titleHeight + sumhbefore + offsetYpage + paddingYbtn;
        //logger.debug('startYforThisBtn:', startYforThisBtn);

        // Make shure that the sum of button w per row is 100 or less
        //if not, let's size them evenly
        let calcBtnsPercWidthIs100 = row.buttons.reduce((n, { w }) => n + Number(w), 0);
        //logger.debug('calcBtnsPercWidthIs100:', calcBtnsPercWidthIs100);

        if (calcBtnsPercWidthIs100 > 100) {
          let widthEqual = 100 / row.buttons.length;
          row.buttons.forEach((btn) => {
            btn.w = Math.round(widthEqual * 100) / 100;
          })
        }

        for (let [bi, button] of row.buttons.entries()) {
          logger.debug('new button id:', bi);

          let percWbefore = 0;
          row.buttons.slice(0, bi).forEach((btn) => {
            percWbefore += Number(btn.w);
          })

          //logger.debug('percWbefore:', percWbefore);
          let sumwbefore = DEVICE_WIDTH * percWbefore / 100;
          //logger.debug('sumwbefore:', sumwbefore);

          let startXforThisBtn = (sumwbefore + paddingXbtn);
          //logger.debug('startXforThisBtn:', startXforThisBtn);

          let widthOfTheButton = ((DEVICE_WIDTH * Number(button.w)) / 100) - (paddingXbtn * 2);
          //logger.debug('widthOfTheButton:', widthOfTheButton);

          let heigthofthebutton = ((pageButtonSpaceH * Number(row.h)) / 100) - (paddingYbtn * 2);
          //logger.debug('heigthofthebutton:', heigthofthebutton);

          //logger.debug('spacer:', button.spacer);
          if (!button.spacer) {
            let btn = createWidget(widget.BUTTON, {
              text: button.text || 'btn_' + pi + ri + bi,
              text_size: button.text_size || TEXT_SIZE,
              color: button.text_color || COLOR_WHITE,
              x: px(startXforThisBtn),
              y: px(startYforThisBtn),
              w: px(widthOfTheButton),
              h: px(heigthofthebutton),
              radius: button.radius || BTN_RADIUS,
              normal_color: button.back_color || COLOR_GRAY,
              press_color: btnPressColor(button.back_color || COLOR_GRAY, 1.3),
              click_func: () => {
                // Azioni locali dell'orologio: non passano dal telefono né dal flusso HTTP.
                if (button.local_action === 'storage_info') {
                  layout.showStorageInfo(pi)
                  return
                }

                if (button.local_action === 'ram_info') {
                  layout.showRamInfo(pi)
                  return
                }

                if (button.local_action === 'system_diag') {
                  layout.showSystemDiag(pi)
                  return
                }

                const spinnerX = startXforThisBtn + (widthOfTheButton - SPINNER_SIZE) / 2
                const spinnerY = startYforThisBtn + (heigthofthebutton - SPINNER_SIZE) / 2
                const runRequest = (text) => {
                  // Image requests keep their spinner until the picture is shown
                  // (cleared in onReceivedFile); others stop it when the task settles.
                  if (vm.pendingImageSpinner) { stopButtonSpinner(vm.pendingImageSpinner); vm.pendingImageSpinner = null }
                  const sp = startButtonSpinner(spinnerX, spinnerY)
                  if (button.request && button.request.response_style === SHOW_IMAGE) {
                    vm.pendingImageSpinner = sp
                    vm.executeButtonRequest(button.request, pi, text)
                  } else {
                    const p = vm.executeButtonRequest(button.request, pi, text)
                    if (p && p.then) {
                      p.then(() => {
                        stopButtonSpinner(sp)
                        if (button.request && typeof button.request.url === 'string' &&
                            button.request.url.indexOf('/mode/toggle') !== -1 &&
                            typeof vm.refreshModeButton === 'function') {
                          vm.refreshModeButton()
                        }
                      }, () => stopButtonSpinner(sp))
                    }
                    else { stopButtonSpinner(sp) }
                  }
                }
                if (button.input) {
                  // Prefer the native system keyboard (API_LEVEL 4.0+);
                  // fall back to the hand-drawn keyboard on older devices.
                  if (isSystemKeyboardAvailable()) {
                    openSystemKeyboard(vm, button, pi, runRequest)
                    return
                  }

                  function onKeyPress(kb, id, value) {
                    logger.debug(`id:${id} char:${value}`)
                    switch (value) {
                      case KEY_BACKSPACE:
                        if (inputText.length > 0) {
                          inputText = inputText.slice(0, -1);
                          kb.setProperty(prop.TEXT, inputText);
                        }
                        break;
                      case KEY_ABC:
                        renderKeyboard(kb_uppercase);
                        break;
                      case KEY_NUM:
                        renderKeyboard(kb_numbers);
                        break;
                      case KEY_SYMB:
                        renderKeyboard(kb_symbols);
                        break;
                      case KEY_abc:
                        renderKeyboard(kb_lowercase);
                        break;
                      case KEY_SEND:
                        sendText(inputText);
                        break;
                      case KEY_CANCEL:
                        inputText = '';
                        kb.setProperty(prop.TEXT, inputText);
                        closeKeyboard();
                        break;
                      default:
                        // Normal character
                        inputText += String.fromCharCode(value);
                        kb.setProperty(prop.TEXT, inputText);
                    }
                  }

                  function sendText(text) {
                    inputText = ''
                    logger.debug('Text sent:', text);
                    runRequest(text)
                    closeKeyboard()
                  }

                  function closeKeyboard() {
                    if (currentKeyboard) {
                      deleteWidget(currentKeyboard)
                      deleteWidget(kbBackground)
                      currentKeyboard = null
                      kbBackground = null
                      setScrollLock({lock: false})
                      setScrollMode({
                        mode: SCROLL_MODE_SWIPER,
                        options: {
                          height: DEVICE_HEIGHT,
                          count: data.pages.length,
                        },
                      });
                    }
                  }

                  function renderKeyboard(layout) {
                    //closeKeyboard()
                    setScrollLock({lock: true})

                    if (!currentKeyboard) {
                      inputText = '';
                      // Covering background
                      kbBackground = createWidget(widget.FILL_RECT, {
                        x: 0, y: px(offsetYpage),
                        w: DEVICE_WIDTH, h: DEVICE_HEIGHT,
                        color: 0x000000,
                        alpha: 210       // (0-255)
                      });
                      currentKeyboard = createWidget(widget.KEYBOARD, {
                        click_func: onKeyPress,
                        key_attr: layout
                      });

                      currentKeyboard.setProperty(prop.Y, px(offsetYpage))

                      currentKeyboard.setProperty(prop.TEXT_STYLE, {
                        x: 0, y:  px(offsetYpage + 100),  // text position above keyboard
                        w: DEVICE_WIDTH,
                        align_h: align.CENTER,
                        color: 0xffffff,
                        show: 1
                      });

                      currentKeyboard.setProperty(prop.TEXT, inputText);
                      currentLayoutIds = new Set(layout.map(k => k.id));
                    } else {
                      applyLayout(layout);
                    }
                  }

                  function applyLayout(newLayout) {
                    if (!currentKeyboard) {
                      renderKeyboard(newLayout);
                      return;
                    }

                    const newIds = new Set(newLayout.map(k => k.id));

                    // update or add keys
                    newLayout.forEach(key => {
                      if (currentLayoutIds.has(key.id)) {
                        currentKeyboard.setProperty(prop.KEY_PARA, {
                          id: key.id,
                          x: key.x, y: key.y,
                          text: key.text,  // single char only
                          image: key.image, // optional for special buttons
                          value: key.value
                        });
                      } else {
                        currentKeyboard.setProperty(prop.ADD_KEY, key);
                      }
                    });

                    // remove keys no longer present
                    currentLayoutIds.forEach(oldId => {
                      if (!newIds.has(oldId)) {
                        currentKeyboard.setProperty(prop.DEL_KEY, { id: oldId });
                      }
                    });

                    currentLayoutIds = newIds;
                  }

                  // Get initial keyboard based on button's keyboard_type setting
                  const initialKeyboard = getInitialKeyboard(button.keyboard_type);
                  renderKeyboard(initialKeyboard);
                } else {
                  runRequest()
                }
              }
            });

            // Salva la geometria reale del pulsante Memoria per centrare il risultato.
            if (button.local_action === 'storage_info') {
              layout.refs.storageButtonTop = startYforThisBtn - offsetYpage
              layout.refs.storageButtonHeight = heigthofthebutton
            }

            if (button.request && typeof button.request.url === 'string' &&
                button.request.url.indexOf('/mode/toggle') !== -1) {
              vm.modeButton = btn
              vm.modeButtonRequest = button.request
            }
          }
        };//buttons
      };//rows
    };//pages

    this.refs.customToast = createWidget(widget.GROUP, {
      x: px(NOTIFICATION_X),
      y: px(NOTIFICATION_Y),
      w: px(NOTIFICATION_WIDTH),
      h: px(NOTIFICATION_H_MIN),
    })

    this.refs.customToastFillRect = this.refs.customToast.createWidget(widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: px(NOTIFICATION_WIDTH),
      h: px(NOTIFICATION_H_MIN),
      radius: 30,
      color: COLOR_GRAY_TOAST,
      alpha: 235,
    })

    this.refs.customToastText = this.refs.customToast.createWidget(widget.TEXT, {
      x: 10,
      y: 10,
      w: px(NOTIFICATION_WIDTH - 20),
      h: px(NOTIFICATION_H_MIN - 20),
      color: COLOR_WHITE,
      text_size: NOTIFICATION_TEXT_SIZE,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.WRAP,
      text: 'Hi'
    })

    this.refs.customToast.addEventListener(event.CLICK_DOWN, () => {
      if (this.refs.customToastDismissOnTouch !== false) {
        this.refs.customToast.setProperty(prop.VISIBLE, false);
      }
    })

    this.refs.customToast.setProperty(prop.VISIBLE, false);

    /* Fullscreen image overlay (response_style = SHOW_IMAGE) is built lazily in
       showImage() with TOP-LEVEL widgets — IMG does not render as a GROUP child,
       which left a black background with no image on top. */
    this.refs.imageViewBg = null;
    this.refs.imageViewImg = null;

  },
  hideImage() {
    if (this.refs.imageViewImg) { deleteWidget(this.refs.imageViewImg); this.refs.imageViewImg = null; }
    if (this.refs.imageViewSpinner) { deleteWidget(this.refs.imageViewSpinner); this.refs.imageViewSpinner = null; }
    if (this.refs.imageViewLoadingText) { deleteWidget(this.refs.imageViewLoadingText); this.refs.imageViewLoadingText = null; }
    if (this.refs.imageViewBg) { deleteWidget(this.refs.imageViewBg); this.refs.imageViewBg = null; }
  },
  showImage(vm, filePath, pageid) {
    const offsetY = (pageid || 0) * DEVICE_HEIGHT;
    this.hideImage();
    logger.debug('showImage src', filePath);
    // Top-level widgets, placed on the page that triggered the request (the
    // swiper offsets each page by one screen height). Black backdrop first,
    // image (created with its src) on top; tap either to dismiss.
    this.refs.imageViewBg = createWidget(widget.FILL_RECT, {
      x: 0, y: px(offsetY), w: px(DEVICE_WIDTH), h: px(DEVICE_HEIGHT),
      color: COLOR_BLACK, alpha: 255,
    });
    // Create at native size first so we can read the image's real dimensions,
    // then scale-to-fit (keeping aspect) and center it on both axes.
    const img = createWidget(widget.IMG, { x: 0, y: px(offsetY), src: filePath });
    const iw = img.getProperty(prop.W);
    const ih = img.getProperty(prop.H);
    logger.debug('image native size', iw, ih);
    if (iw && ih && iw > 0 && ih > 0) {
      const scale = Math.min(DEVICE_WIDTH / iw, DEVICE_HEIGHT / ih);
      const w = Math.round(iw * scale);
      const h = Math.round(ih * scale);
      img.setProperty(prop.MORE, {
        x: px(Math.round((DEVICE_WIDTH - w) / 2)),
        y: px(Math.round(offsetY + (DEVICE_HEIGHT - h) / 2)),
        w: px(w), h: px(h),
        auto_scale: true,
        auto_scale_obj_fit: true, // box already matches aspect, so fill = no distortion
      });
    } else {
      // Dimensions unknown: fall back to fit-to-screen keeping aspect (may
      // top-align for non-square images).
      img.setProperty(prop.MORE, {
        x: 0, y: px(offsetY),
        w: px(DEVICE_WIDTH), h: px(DEVICE_HEIGHT),
        auto_scale: true,
        auto_scale_obj_fit: false,
      });
    }
    this.refs.imageViewImg = img;
    // Tap disabilitato: usare SELECT per tenere o BACK per scartare
  },
  notifyResult(txt, pageid, isError, type, dismissOnTouch = true, centerInContent = false) {
    if (type == SYSTEM_TOAST) {
      showToast({
        content: txt,
      })
    } else if (type == CUSTOM_TOAST) {
      this.refs.customToastDismissOnTouch = dismissOnTouch
      let { width, height } = getTextLayout(txt, {
        text_size: NOTIFICATION_TEXT_SIZE,
        text_width: px(NOTIFICATION_WIDTH - 20),
        wrapped: 1,//whether the text is line feed, 0: no line feed; 1: line feed
        rows_max: 7
      })

      const toastHeight = height + 20
      const localY =
        centerInContent &&
        this.refs.storageButtonTop !== undefined &&
        this.refs.storageButtonHeight !== undefined
          ? this.refs.storageButtonTop +
            ((this.refs.storageButtonHeight - toastHeight) / 2) - 18
          : NOTIFICATION_Y - height + 20

      this.refs.customToast.setProperty(prop.MORE, {
        x: px(NOTIFICATION_X),
        y: px(localY) + (pageid * DEVICE_HEIGHT),
        w: px(NOTIFICATION_WIDTH),
        h: toastHeight,
      });
      this.refs.customToastFillRect.setProperty(prop.MORE, {
        x: 0, y: 0, w: px(NOTIFICATION_WIDTH), h: height + 20,
        color: isError ? COLOR_RED : COLOR_GRAY_TOAST,
      });
      this.refs.customToastText.setProperty(prop.MORE, {
        text: txt,
        align_h: align.CENTER_H,
        align_v: align.CENTER_V,
        text_style: text_style.WRAP,
        x: 10, y: 10, w: px(NOTIFICATION_WIDTH - 20), h: height,
      });

      this.refs.customToast.setProperty(prop.VISIBLE, true);

    } else if (type == SYSTEM_MODAL) {
      let systemModal = createModal({
       // title: txt,
        text: txt,
        autoHide: true,
        show: true
      })
    } else if (type == NO_NOTIFICATION) {
      return;
    } else {
      showToast({
        content: txt,
      })
    }
  }
}
