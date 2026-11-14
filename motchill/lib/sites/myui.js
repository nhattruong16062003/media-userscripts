  function myuiAdapter(doc, pageUrl) {
    return baseAdapter(families.MYUI, [
      { selector: 'body > .container > .row', position: 'before' },
      { selector: 'body > .container', position: 'prepend' },
      { selector: '.myui-panel', position: 'before', exclude: 'header,.myui-sidebar' },
      { selector: 'main', position: 'prepend' },
      { selector: 'body', position: 'prepend' },
    ], '#servers-container .tab-pane.active a[href],.myui-content__list a[href]', doc, pageUrl);
  }
