import { PLACEHOLDER_IMAGE_CUSTOM_PROPERTY } from '../../constants';
import { enqueue, subscribe, unsubscribe } from '../../scheduler';
import { append, detach } from '../../utils/dom';
import { proximityCheck } from '../../utils/misc';
import { blurImage } from './blur';

const IMAGE_LOAD_RANGE = 1;

const apis = [];

function _checkIfPicturesNeedToBeLoaded(client) {
  apis.forEach(api => {
    const rect = api.getRect();
    const isInLoadRange = proximityCheck(rect, client, IMAGE_LOAD_RANGE);

    if (isInLoadRange && !api.isLoading && !api.isLoaded) {
      enqueue(function _loadPicture() {
        api.load();
      });
    } else if (!isInLoadRange && (api.isLoading || api.isLoaded)) {
      enqueue(function _unloadPicture() {
        api.unload();
      });
    }
  });
}

const register = api => {
  apis.push(api);

  if (apis.length === 1) {
    subscribe(_checkIfPicturesNeedToBeLoaded);
  }
};

const unregister = api => {
  apis.splice(apis.indexOf(api), 1);

  if (apis.length === 0) {
    unsubscribe(_checkIfPicturesNeedToBeLoaded);
  }
};

export const addLazyLoadableAPI = ({ rootEl, placeholderEl, pictureEl, blurSrc, alt }) => {
  let api = null;
  let imgEl = null;
  let hasPlaceholder = false;

  const getRect = () => {
    // Fixed images should use their parent's rect, as they're always in the viewport
    const position = window.getComputedStyle(rootEl).position;
    const measurableEl = position === 'fixed' ? rootEl.parentElement : rootEl;

    return measurableEl.getBoundingClientRect();
  };

  const load = () => {
    if (imgEl) {
      unload();
    }

    api.isLoading = true;
    rootEl.setAttribute('loading', '');
    imgEl = document.createElement('img');
    imgEl.setAttribute('alt', alt);
    imgEl.addEventListener('load', onLoad, false);
    append(pictureEl, imgEl);

    if (!hasPlaceholder) {
      enqueue(function _createAndAddPlaceholderImage() {
        blurImage(blurSrc, (err, blurredImageURL) => {
          if (err) {
            return;
          }

          hasPlaceholder = true;
          placeholderEl.style.setProperty(PLACEHOLDER_IMAGE_CUSTOM_PROPERTY, `url("${blurredImageURL}")`);
        });
      });
    }
  };

  const unload = () => {
    api.isLoading = false;
    api.isLoaded = false;
    rootEl.removeAttribute('loading');
    rootEl.removeAttribute('loaded');
    detach(imgEl);
    imgEl = null;
  };

  const onLoad = () => {
    if (!imgEl) {
      return;
    }

    api.isLoading = false;
    api.isLoaded = true;
    rootEl.removeAttribute('loading');
    rootEl.setAttribute('loaded', '');
    imgEl.removeEventListener('load', onLoad);

    if (api.loadedHook) {
      api.loadedHook(imgEl);
    }
  };

  const forget = () => unregister(api);

  api = {
    forget,
    getRect,
    isLoaded: false,
    isLoading: false,
    load,
    unload
  };

  register(api);

  rootEl.api = api;
};
