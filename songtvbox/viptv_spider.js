/**
 * TVB云播 Spider for TVBoxOSC
 * Site: http://www.viptv01.com
 * CMS: AppleCMS (Maccms)
 */

(function () {
  let Viptv = function () {};

  // Default headers
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const HOST = 'http://www.viptv01.com';

  function getHtml(url) {
    let res = req(url, {
      headers: {
        'User-Agent': UA,
        'Referer': HOST
      }
    });
    return res || '';
  }

  // Parse video list from category page (myui-vodlist__box)
  function parseCategoryList(html) {
    let list = [];
    let $ = cheerio.load(html, { decodeEntities: false });
    $('.myui-vodlist__box').each(function () {
      let a = $(this).find('.myui-vodlist__thumb');
      let href = a.attr('href') || '';
      let id = href.match(/\/vod\/detail\/id\/(\d+)\.html/);
      if (!id) return;
      let remark = $(this).find('.pic-tag-top .tag').text().trim();
      list.push({
        vod_id: id[1],
        vod_name: a.attr('title') || '',
        vod_pic: a.attr('data-original') || a.attr('src') || '',
        vod_remarks: remark
      });
    });
    return list;
  }

  // Parse video list from search page (myui-vodlist__media li)
  function parseSearchList(html) {
    let list = [];
    let $ = cheerio.load(html, { decodeEntities: false });
    $('#searchList li').each(function () {
      let a = $(this).find('.myui-vodlist__thumb');
      let href = a.attr('href') || '';
      let id = href.match(/\/vod\/detail\/id\/(\d+)\.html/);
      if (!id) return;
      let remark = $(this).find('.pic-tag-top .tag').text().trim();
      let name = $(this).find('.title a').text().trim() || a.attr('title') || '';
      list.push({
        vod_id: id[1],
        vod_name: name,
        vod_pic: a.attr('data-original') || a.attr('src') || '',
        vod_remarks: remark
      });
    });
    return list;
  }

  // ===== Spider API =====

  Viptv.prototype.init = function (ext) {
    this.ext = ext;
  };

  Viptv.prototype.homeContent = function () {
    let cats = [
      { "type_id": 1, "type_name": "电影" },
      { "type_id": 2, "type_name": "剧集" },
      { "type_id": 3, "type_name": "综艺" },
      { "type_id": 4, "type_name": "动漫" },
      { "type_id": 5, "type_name": "短剧" },
      { "type_id": 6, "type_name": "动作片" },
      { "type_id": 7, "type_name": "喜剧片" },
      { "type_id": 8, "type_name": "爱情片" },
      { "type_id": 9, "type_name": "科幻片" },
      { "type_id": 10, "type_name": "剧情片" },
      { "type_id": 11, "type_name": "恐怖片" },
      { "type_id": 12, "type_name": "战争片" },
      { "type_id": 13, "type_name": "国产剧" },
      { "type_id": 14, "type_name": "港台剧" },
      { "type_id": 15, "type_name": "日韩剧" },
      { "type_id": 16, "type_name": "欧美剧" },
      { "type_id": 20, "type_name": "海外剧" }
    ];
    return JSON.stringify({ code: 1, msg: "", class: cats });
  };

  Viptv.prototype.homeVideoContent = function () {
    let html = getHtml(HOST + '/');
    let list = parseCategoryList(html);
    return JSON.stringify({ code: 1, msg: "", list: list });
  };

  Viptv.prototype.categoryContent = function (tid, pg, filter, extend) {
    let url = HOST + '/vod/type/id/' + tid + '.html';
    if (pg > 1) url = HOST + '/vod/type/id/' + tid + '/page/' + pg + '.html';
    let html = getHtml(url);
    let list = parseCategoryList(html);

    // Parse total pages from footer
    let $ = cheerio.load(html, { decodeEntities: false });
    let pageHtml = $('.myui-page').html();
    let pageCount = 1;
    if (pageHtml) {
      let pages = pageHtml.match(/page\/(\d+)\.html/g);
      if (pages && pages.length > 0) {
        pages.forEach(function (p) {
          let n = parseInt(p.match(/(\d+)/)[1]);
          if (n > pageCount) pageCount = n;
        });
      }
    }

    return JSON.stringify({
      code: 1,
      msg: "",
      page: parseInt(pg),
      pagecount: pageCount,
      limit: 24,
      total: pageCount * 24,
      list: list
    });
  };

  Viptv.prototype.detailContent = function (ids) {
    let id = ids.split('/')[0];
    let html = getHtml(HOST + '/vod/detail/id/' + id + '.html');
    let $ = cheerio.load(html, { decodeEntities: false });

    let name = $('.myui-content__detail h1.title').text().trim();
    let pic = $('.myui-content__thumb .myui-vodlist__thumb').attr('data-original') || $('.myui-content__thumb img').attr('src') || '';
    let typeName = $('.myui-content__detail .data a').first().text().trim();
    let year = $('.myui-content__detail .data a[href*="year"]').text().trim();
    let area = $('.myui-content__detail .data a[href*="area"]').text().trim();
    let actor = [];
    let director = [];
    $('.myui-content__detail .data a[href*="actor"]').each(function () { actor.push($(this).text().trim()); });
    $('.myui-content__detail .data a[href*="director"]').each(function () { director.push($(this).text().trim()); });
    let remark = $('.myui-content__detail .text-red').text().trim();
    let descHtml = $.html();
    let desc = '';
    let descMatch = descHtml.match(/简介：([^<]*)/);
    if (descMatch) desc = descMatch[1].trim();

    // Parse play list
    let playGroups = {};
    $('.myui-content__list a').each(function () {
      let href = $(this).attr('href') || '';
      let epName = $(this).text().trim();
      if (href && epName) {
        let match = href.match(/\/vod\/play\/id\/(\d+)\/sid\/(\d+)\/nid\/(\d+)\.html/);
        if (match) {
          let sid = match[2];
          if (!playGroups[sid]) playGroups[sid] = [];
          playGroups[sid].push(epName + '$' + href);
        }
      }
    });

    let playFrom = [];
    let playUrls = [];
    Object.keys(playGroups).forEach(function (sid) {
      playFrom.push('线路' + sid);
      playUrls.push(playGroups[sid].join('#'));
    });

    let vod = {
      vod_id: id,
      vod_name: name,
      vod_pic: pic,
      type_name: typeName,
      vod_year: year,
      vod_area: area,
      vod_actor: actor.join(','),
      vod_director: director.join(','),
      vod_content: desc,
      vod_remarks: remark,
      vod_play_from: playFrom.join('$$$'),
      vod_play_url: playUrls.join('$$$')
    };

    return JSON.stringify({ code: 1, msg: "", list: [vod] });
  };

  Viptv.prototype.searchContent = function (key, quick) {
    let html = getHtml(HOST + '/vod/search.html?wd=' + encodeURIComponent(key));
    let list = parseSearchList(html);
    return JSON.stringify({ code: 1, msg: "", list: list });
  };

  Viptv.prototype.playerContent = function (id, flag) {
    let html = getHtml(HOST + id);
    let url = '';
    let match = html.match(/"url":"([^"]+)"/);
    if (match) {
      url = match[1].replace(/\\\//g, '/').replace(/\\u[\s\S]{4}/g, function (m) {
        return String.fromCharCode(parseInt(m.slice(2), 16));
      });
    }
    return JSON.stringify({ code: 1, msg: "", url: url });
  };

  return Viptv;
})();
