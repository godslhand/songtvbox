/**
 * TVB云播 Spider for TVBoxOSC
 * Site: http://www.viptv01.com
 * CMS: AppleCMS (Maccms)
 */

(function () {
  var Viptv = function () {};

  var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  var HOST = 'http://www.viptv01.com';

  function getHtml(url) {
    var res = req(url, {
      headers: {
        'User-Agent': UA,
        'Referer': HOST
      }
    });
    return res || '';
  }

  function parseCategoryList(html) {
    var list = [];
    try {
      var $ = cheerio.load(html, { decodeEntities: false });
      $('.myui-vodlist__box').each(function () {
        var a = $(this).find('.myui-vodlist__thumb');
        var href = a.attr('href') || '';
        var id = href.match(/\/vod\/detail\/id\/(\d+)\.html/);
        if (!id) return;
        var remark = $(this).find('.pic-tag-top .tag').text().trim();
        list.push({
          vod_id: id[1],
          vod_name: a.attr('title') || '',
          vod_pic: a.attr('data-original') || a.attr('src') || '',
          vod_remarks: remark
        });
      });
    } catch(e) {}
    return list;
  }

  function parseSearchList(html) {
    var list = [];
    try {
      var $ = cheerio.load(html, { decodeEntities: false });
      $('#searchList li').each(function () {
        var a = $(this).find('.myui-vodlist__thumb');
        var href = a.attr('href') || '';
        var id = href.match(/\/vod\/detail\/id\/(\d+)\.html/);
        if (!id) return;
        var remark = $(this).find('.pic-tag-top .tag').text().trim();
        var name = $(this).find('.title a').text().trim() || a.attr('title') || '';
        list.push({
          vod_id: id[1],
          vod_name: name,
          vod_pic: a.attr('data-original') || a.attr('src') || '',
          vod_remarks: remark
        });
      });
    } catch(e) {}
    return list;
  }

  Viptv.prototype.init = function (ext) {
    this.ext = ext;
  };

  Viptv.prototype.homeContent = function () {
    var cats = [
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
    var html = getHtml(HOST + '/');
    var list = parseCategoryList(html);
    return JSON.stringify({ code: 1, msg: "", list: list });
  };

  Viptv.prototype.categoryContent = function (tid, pg, filter, extend) {
    var url = HOST + '/vod/type/id/' + tid + '.html';
    if (pg > 1) url = HOST + '/vod/type/id/' + tid + '/page/' + pg + '.html';
    var html = getHtml(url);
    var list = parseCategoryList(html);

    var pageCount = 1;
    try {
      var $ = cheerio.load(html, { decodeEntities: false });
      var pageHtml = $('.myui-page').html();
      if (pageHtml) {
        var pages = pageHtml.match(/page\/(\d+)\.html/g);
        if (pages && pages.length > 0) {
          for (var i = 0; i < pages.length; i++) {
            var n = parseInt(pages[i].match(/(\d+)/)[1]);
            if (n > pageCount) pageCount = n;
          }
        }
      }
    } catch(e) {}

    return JSON.stringify({
      code: 1, msg: "",
      page: parseInt(pg),
      pagecount: pageCount,
      limit: 24,
      total: pageCount * 24,
      list: list
    });
  };

  Viptv.prototype.detailContent = function (ids) {
    var id = ids.split('/')[0];
    var html = getHtml(HOST + '/vod/detail/id/' + id + '.html');
    var vod = {
      vod_id: id,
      vod_name: '',
      vod_pic: '',
      type_name: '',
      vod_year: '',
      vod_area: '',
      vod_actor: '',
      vod_director: '',
      vod_content: '',
      vod_remarks: '',
      vod_play_from: '',
      vod_play_url: ''
    };
    try {
      var $ = cheerio.load(html, { decodeEntities: false });
      vod.vod_name = $('.myui-content__detail h1.title').text().trim();
      vod.vod_pic = $('.myui-content__thumb .myui-vodlist__thumb').attr('data-original') || $('.myui-content__thumb img').attr('src') || '';
      vod.type_name = $('.myui-content__detail .data a').first().text().trim();
      vod.vod_year = $('.myui-content__detail .data a[href*="year"]').text().trim();
      vod.vod_area = $('.myui-content__detail .data a[href*="area"]').text().trim();
      var actorArr = [], directorArr = [];
      $('.myui-content__detail .data a[href*="actor"]').each(function () { actorArr.push($(this).text().trim()); });
      $('.myui-content__detail .data a[href*="director"]').each(function () { directorArr.push($(this).text().trim()); });
      vod.vod_actor = actorArr.join(',');
      vod.vod_director = directorArr.join(',');
      vod.vod_remarks = $('.myui-content__detail .text-red').text().trim();
      var descHtml = $.html();
      var descMatch = descHtml.match(/简介：([^<]*)/);
      if (descMatch) vod.vod_content = descMatch[1].trim();

      var playGroups = {};
      $('.myui-content__list a').each(function () {
        var href = $(this).attr('href') || '';
        var epName = $(this).text().trim();
        if (href && epName) {
          var match = href.match(/\/vod\/play\/id\/(\d+)\/sid\/(\d+)\/nid\/(\d+)\.html/);
          if (match) {
            var sid = match[2];
            if (!playGroups[sid]) playGroups[sid] = [];
            playGroups[sid].push(epName + '$' + href);
          }
        }
      });
      var playFrom = [], playUrls = [];
      var keys = Object.keys(playGroups);
      for (var k = 0; k < keys.length; k++) {
        var sid = keys[k];
        playFrom.push('线路' + sid);
        playUrls.push(playGroups[sid].join('#'));
      }
      vod.vod_play_from = playFrom.join('$$$');
      vod.vod_play_url = playUrls.join('$$$');
    } catch(e) {}

    return JSON.stringify({ code: 1, msg: "", list: [vod] });
  };

  Viptv.prototype.searchContent = function (key, quick) {
    var html = getHtml(HOST + '/vod/search.html?wd=' + encodeURIComponent(key));
    var list = parseSearchList(html);
    return JSON.stringify({ code: 1, msg: "", list: list });
  };

  Viptv.prototype.playerContent = function (id, flag) {
    var html = getHtml(HOST + id);
    var url = '';
    var match = html.match(/"url":"([^"]+)"/);
    if (match) {
      url = match[1].replace(/\\\//g, '/').replace(/\\u[\s\S]{4}/g, function (m) {
        return String.fromCharCode(parseInt(m.slice(2), 16));
      });
    }
    return JSON.stringify({ code: 1, msg: "", url: url });
  };

  return Viptv;
})();
