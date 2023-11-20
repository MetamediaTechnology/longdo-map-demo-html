var map;
let isExpandPanel = false;
let offsetSearch = 0;
let offsetNearPoi = 0;
const limitSearch = 20;
const limitNearPoi = 20;
let currentLocation;
const searchApi = 'https://search.longdo.com/mapsearch/json/search';
const nearPoiApi = 'https://api.longdo.com/POIService/json/search';
const suggestApi = 'https://search.longdo.com/mapsearch/json/suggest';
let currentKeyword = '';

const init = () => {
    map = new longdo.Map({
        placeholder: document.getElementById('map'),
    });
    map.Ui.Zoombar.visible(false);
    map.Ui.DPad.visible(false);
    map.Ui.Geolocation.visible(false);
    map.Ui.Terrain.visible(false);
    map.Ui.LayerSelector.visible(false);
    map.Ui.Scale.visible(false);
    if (map.Ui.Fullscreen) map.Ui.Fullscreen.visible(false);

    document.addEventListener('click', function (event) {
        var searchInput = document.getElementById('search');
        var targetElement = event.target;

        if (targetElement !== searchInput) {
            document.getElementById('suggest').classList.add('hide');
        }
    });

    map.Event.bind('geolocationError', () => {
        alert('โปรดเปิด Location Service เพื่อค้นหาร้านค้าใกล้ตัวท่าน');
    });
};

const doSuggest = (e) => {
    if (e)
        if (e.keyCode === 13 || e.key === 'Enter') {
            doSearch();
            return;
        }

    var suggest = document.getElementById('suggest');
    const keyword = document.getElementById('search').value;

    // suggest api
    const params = {
        keyword,
        limit: 10,
        offset: offsetSearch,
        key: mapKey,
    };
    const url = new URL(suggestApi);
    url.search = new URLSearchParams(params).toString();
    fetch(url)
        .then((response) => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then((result) => {
            if (result.meta.keyword != search.value) return;

            suggest.innerHTML = '';
            for (var i = 0, item; (item = result.data[i]); ++i) {
                longdo.Util.append(suggest, 'a', {
                    innerHTML: item.d,
                    href: "javascript:onClickSuggest('" + item.w + "')",
                    className: 'suggest-item',
                });
            }
            if (suggest.childElementCount > 0)
                document.getElementById('suggest').classList.remove('hide');
            else document.getElementById('suggest').classList.add('hide');

            suggest.style.display = 'block';
        })
        .catch((error) => {
            console.error('There was a problem with the fetch operation:', error);
        });
};

const doSearch = () => {
    currentKeyword = document.getElementById('search').value;

    if (currentKeyword.length > 1) {
        document.getElementById('near-poi-more-btn').classList.add('hide');
        document.getElementById('search-more-btn').classList.add('hide');
        offsetSearch = 0;
        map.Overlays.clear();

        // search api
        const params = {
            keyword: currentKeyword,
            limit: limitSearch,
            key: mapKey,
        };
        const url = new URL(searchApi);
        url.search = new URLSearchParams(params).toString();
        fetch(url)
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then((result) => {
                var searchResult = document.getElementById('search-result-list');
                if (result.meta.keyword != search.value) return;
                searchResult.innerHTML = '';
                document.getElementById('search-result-panel').classList.remove('hide');
                if (result.data.length > 0) {
                    document.getElementById('empty-container').classList.add('hide');
                    const locationList = [];
                    for (var i = 0, item; (item = result.data[i]); ++i) {
                        if (item.lat && item.lon) {
                            locationList.push({ lat: item.lat, lon: item.lon });
                            drawMarker(item);
                        }
                        longdo.Util.append(searchResult, 'div', exploreItem(item));
                    }
                    searchResult.style.display = 'block';

                    if (result.data.length === limitSearch) {
                        document.getElementById('search-more-btn').classList.remove('hide');
                    }
                    if (locationList.length) {
                        var boundingBox = locationBound(locationList);
                        map.bound(boundingBox);
                    }
                } else {
                    document.getElementById('empty-container').classList.remove('hide');
                }
            })
            .catch((error) => {
                console.error('There was a problem with the fetch operation:', error);
            });
        document.getElementById('suggest').classList.add('hide');
    }
};

const doSearchMore = () => {
    offsetSearch += 20;

    document.getElementById('near-poi-more-btn').classList.add('hide');
    document.getElementById('search-more-btn').classList.add('hide');

    var searchResult = document.getElementById('search-result-list');

    // search api
    const params = {
        keyword: currentKeyword,
        limit: limitSearch,
        offset: offsetSearch,
        key: mapKey,
    };
    const url = new URL(searchApi);
    url.search = new URLSearchParams(params).toString();
    fetch(url)
        .then((response) => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then((result) => {
            if (result.data.length > 0) {
                const locationList = [];
                for (var i = 0, item; (item = result.data[i]); ++i) {
                    if (item.lat && item.lon) {
                        locationList.push({ lat: item.lat, lon: item.lon });
                        drawMarker(item);
                    }
                    longdo.Util.append(searchResult, 'div', exploreItem(item));
                }
                if (result.data.length === limitSearch) {
                    document.getElementById('search-more-btn').classList.remove('hide');
                }
                if (locationList.length) {
                    var boundingBox = locationBound(locationList);
                    map.bound(boundingBox);
                }
            }
        })
        .catch((error) => {
            offsetSearch -= 20;
            console.error('There was a problem with the fetch operation:', error);
        });
    document.getElementById('suggest').classList.add('hide');
};

const doNearPoi = () => {
    document.getElementById('near-poi-more-btn').classList.add('hide');
    document.getElementById('search-more-btn').classList.add('hide');
    document.getElementById('search-result-panel').classList.remove('hide');
    document.getElementById('empty-container').classList.add('hide');

    offsetNearPoi = 0;

    document.getElementById('search').value = '';
    var searchResult = document.getElementById('search-result-list');
    searchResult.innerHTML = '';
    map.Overlays.clear();
    currentLocation = map.location();

    // nearPoi api
    const params = {
        lat: currentLocation.lat,
        lon: currentLocation.lon,
        limit: limitNearPoi,
        key: mapKey,
    };
    const url = new URL(nearPoiApi);
    url.search = new URLSearchParams(params).toString();
    fetch(url)
        .then((response) => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then((result) => {
            for (var i = 0, item; (item = result.data[i]); ++i) {
                if (item.lat && item.lon) {
                    drawMarker(item);
                }
                longdo.Util.append(searchResult, 'div', exploreItem(item));
            }

            if (result.data.length === limitNearPoi) {
                document.getElementById('near-poi-more-btn').classList.remove('hide');
            }
        })
        .catch((error) => {
            console.error('There was a problem with the fetch operation:', error);
        });
};

const doNearPoiMore = () => {
    var searchResult = document.getElementById('search-result-list');
    offsetNearPoi += 20;

    // nearPoi api
    const params = {
        lat: currentLocation.lat,
        lon: currentLocation.lon,
        limit: limitNearPoi,
        offset: offsetNearPoi,
        key: mapKey,
    };
    const url = new URL(nearPoiApi);
    url.search = new URLSearchParams(params).toString();
    fetch(url)
        .then((response) => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then((result) => {
            for (var i = 0, item; (item = result.data[i]); ++i) {
                if (item.lat && item.lon) {
                    drawMarker(item);
                }
                longdo.Util.append(searchResult, 'div', exploreItem(item));
            }
            if (result.data.length === limitNearPoi) {
                document.getElementById('near-poi-more-btn').classList.remove('hide');
            }
        })
        .catch((error) => {
            console.error('There was a problem with the fetch operation:', error);
        });
};

const onClickSearch = () => {
    doSuggest();
    var suggest = document.getElementById('suggest');
    if (suggest.childElementCount > 0)
        document.getElementById('suggest').classList.remove('hide');
};

const onClickSuggest = (item) => {
    document.getElementById('search').value = item;
    document.getElementById('suggest').innerHTML = '';
    doSearch();
};

const onClickExpand = () => {
    if (isExpandPanel) {
        isExpandPanel = false;
        document
            .getElementById('search-result-panel')
            .classList.remove('expand-panel');
        document.getElementsByClassName('expand')[0].classList.add('rotate');
    } else {
        isExpandPanel = true;
        document
            .getElementById('search-result-panel')
            .classList.add('expand-panel');
        document.getElementsByClassName('expand')[0].classList.remove('rotate');
    }
};

const onClickExploreResult = (item) => {
    if (item.lat && item.lon) {
        const location = {
            lat: item.lat,
            lon: item.lon,
        };
        map.location(location);
    }
};

const drawMarker = (item) => {
    const pinWidth = 30;
    const pinHeight = 44;
    var marker = new longdo.Marker(
        { lon: item.lon, lat: item.lat },
        {
            title: item.name,
            detail: item.address,
            icon: {
                html: `<div style="z-index: 0; width: ${pinWidth}px; height: ${pinHeight}px; display: flex; justify-content: center; align-items: center;">
                    <img :src="src/assets/img/ic_pin.svg" srcset="src/assets/img/ic_pin.svg 1x, src/assets/img/ic_pin.svg 2x" style="width: 100%; height: 100%;">
                </div>`,
                offset: {
                    x: 0,
                    y: -(pinHeight / 2),
                },
            },
        }
    );
    map.Overlays.add(marker);
};

const clearSearch = () => {
    document.getElementById('search').value = '';
    document.getElementById('search-result-panel').classList.add('hide');
    map.Overlays.clear();
};

const getCurrentLocation = () => {
    map.Ui.Geolocation.trigger();
};

const zoomIn = () => {
    map.zoom(true);
};

const zoomOut = () => {
    map.zoom(false);
};

const locationBound = (e) => {
    for (
        var t, n = (t = e[0]).lon, o = t.lat, a = n, r = o, i = 1;
        (t = e[i]);
        ++i
    )
        t.lon < n ? (n = t.lon) : t.lon > a && (a = t.lon),
            t.lat < o ? (o = t.lat) : t.lat > r && (r = t.lat);
    return {
        minLon: n,
        minLat: o,
        maxLon: a,
        maxLat: r,
    };
};

const exploreItem = (i) => {
    const data = {
        id: i.id,
        lat: i.lat,
        lon: i.lon,
        markicon: 'https://mmmap15.longdo.com/mmmap/images/icons/' + i.icon,
        markicon2x: 'https://mmmap15.longdo.com/mmmap/images/icons_2x/' + i.icon,
        name: i.name,
        name_en: i.name,
        objecttype: i.type,
        shortdesc: i.address,
        shortdesc_en: i.address,
        source: i.source,
    };
    if (
        data.objecttype === 'tag' ||
        (data.objecttype === 'other' && data.name.indexOf('tag: ') === 0)
    ) {
        data.objecttype = 'tag';
        data.markicon =
            'https://map.longdo.com/mmmap/images/icon-search-type-tag.png';
        data.markicon2x =
            'https://map.longdo.com/mmmap/images/icon-search-type-tag.png';
    }
    if (data.objecttype === 'khet') {
        data.geocode = Number(data.id.replaceAll('K', ''));
        data.markicon =
            'https://map-test.longdo.com/mmmap/images/icon-search-type-area.png';
        data.markicon2x =
            'https://map-test.longdo.com/mmmap/images/icon-search-type-area.png';
    }
    if (data.objecttype === 'road') {
        data.markicon =
            'https://map-test.longdo.com/mmmap/images/icon-search-type-road.png';
        data.markicon2x =
            'https://map-test.longdo.com/mmmap/images/icon-search-type-road.png';
    }
    if (data.objecttype === 'geom') {
        data.markicon =
            'https://map-test.longdo.com/mmmap/images/icon-geotype-polygon.png';
        data.markicon2x =
            'https://map-test.longdo.com/mmmap/images/icon-geotype-polygon.png';
    }
    if (data.objecttype === 'layer') {
        data.markicon =
            'https://map-test.longdo.com/mmmap/images/icon-geotype-layer.png';
        data.markicon2x =
            'https://map-test.longdo.com/mmmap/images/icon-geotype-layer.png';
    }
    if (data.objecttype === 'water') {
        data.objecttype = data.id[0] === 'X' ? 'water-line' : 'water-area';
        data.markicon =
            'https://map-test.longdo.com/mmmap/images/icon-search-type-water.png';
        data.markicon2x =
            'https://map-test.longdo.com/mmmap/images/icon-search-type-water.png';
    }
    if (data.source === 'google') {
        data.id = `G${new Date().getTime()}_${Math.random()}`;
        data.markicon = i.icon;
        data.markicon2x = i.icon;
    }
    return {
        innerHTML: `<div class="icon">
                <img src="${data.markicon2x}" srcset="${data.markicon} 1x, ${data.markicon2x
            } 2x" loading="lazy">
                </div>
                <div class="detail">
                    <label class="name" title="${data.name}">${data.name
            }</label>
                    <label class="description" title="${data.shortdesc || ''
            }">${data.shortdesc || ''}</label>
                </div>`,
        className: 'search-result-item ripple',
        onclick: (e) => {
            onClickExploreResult(data);
        },
    };
};