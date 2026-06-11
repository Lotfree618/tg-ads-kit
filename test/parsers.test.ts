import {
  mergeAdDailyRows,
  parseTelegramAdsAccountAds,
  parseTelegramAdsAccountBudgetPage,
  parseTelegramAdsAccountEditPage,
  parseTelegramAdsAccountFiveMinuteStatsCsv,
  parseTelegramAdsAccountHourlyBudgetCsv,
  parseTelegramAdsAccountHourlyStatsCsv,
  parseTelegramAdsAdBudgetPage,
  parseTelegramAdsAdDailyReportCsv,
  parseTelegramAdsAdDailyStatsCsv,
  parseTelegramAdsAdDetailPage,
  parseTelegramAdsAdEditPage,
  parseTelegramAdsAdFiveMinuteStatsCsv,
  parseTelegramAdsAdHourlyBudgetCsv,
  parseTelegramAdsAdHourlyStatsCsv,
  parseTelegramAdsAdStatsPage,
  parseTelegramAdsDailyBudgetCsv,
  parseTelegramAdsDailyStatsCsv,
  parseTelegramAdsMonthlyReportCsv,
} from '../src/index.js';

describe('Telegram Ads parsers', () => {
  it('parses TSV reports and account page ad metadata', () => {
    const dailyStats = parseTelegramAdsDailyStatsCsv('date\tViews\tClicks\tActions\n16 Jan 2026\t1000\t25\t3\n');
    const dailyBudget = parseTelegramAdsDailyBudgetCsv('date\tSpent budget, TON\n16 Jan 2026\t1.23456\n');
    const monthly = parseTelegramAdsMonthlyReportCsv(
      'Ad ID\tAd Title\tViews\tAmount, TON\nAD00000187\tTG Ad A\t999\t0,0402\nTotal in Jun 2026\t\t999\t0,0402\n',
      '202606',
    );
    const accountHourlyStats = parseTelegramAdsAccountHourlyStatsCsv(
      [
        'date\tViews\tClicks\tActions',
        ...Array.from(
          { length: 12 },
          (_, index) => `09 June 2026 2:${String(index * 5).padStart(2, '0')} UTC\t10\t${index === 0 ? 2 : 1}\t${index === 0 ? 1 : 0}`,
        ),
      ].join('\n'),
    );
    const accountHourlyBudget = parseTelegramAdsAccountHourlyBudgetCsv(
      [
        'date\tSpent budget, TON',
        ...Array.from({ length: 12 }, (_, index) => `09 June 2026 2:${String(index * 5).padStart(2, '0')} UTC\t0.0001`),
      ].join('\n'),
    );
    const adDailyReport = parseTelegramAdsAdDailyReportCsv(
      '187',
      'Day\tViews\tAmount, TON\n16 January 2026\t1000\t1.23456\nTotal in January 2026\t1000\t1.23456\n',
    );
    const adStats = parseTelegramAdsAdDailyStatsCsv('187', 'date\tViews\tClicks\tJoined\n16 Jan 2026\t1000\t25\t3\n17 Jan 2026\t500\t10\t1\n');
    const hourlyStats = parseTelegramAdsAdHourlyStatsCsv(
      '187',
      [
        'date\tViews\tClicks\tJoined',
        ...Array.from(
          { length: 12 },
          (_, index) => `09 June 2026 2:${String(index * 5).padStart(2, '0')} UTC\t10\t${index === 0 ? 2 : 1}\t${index === 0 ? 1 : 0}`,
        ),
      ].join('\n'),
    );
    const hourlyBudget = parseTelegramAdsAdHourlyBudgetCsv(
      '187',
      [
        'date\tSpent budget, TON',
        ...Array.from({ length: 12 }, (_, index) => `09 June 2026 2:${String(index * 5).padStart(2, '0')} UTC\t0.0001`),
      ].join('\n'),
    );
    const ads = parseTelegramAdsAccountAds(`
      <table>
        <tbody class="js-ads-table-body">
          <tr>
            <td><div class="pr-cell pr-cell-title"><a href="/account/ad/12345" class="pr-link">TG Ad A</a></div></td>
            <td style="display:var(--coldp-cpm,table-cell)"><div class="pr-cell"><a href="/account/ad/12345/edit_cpm"><span class="amount-currency currency-ton"><svg></svg></span>0<span class="amount-frac">.30</span></a></div></td>
            <td style="display:var(--coldp-budget,table-cell)"><div class="pr-cell"><a href="/account/ad/12345/edit_budget"><span class="amount-currency currency-ton"><svg></svg></span>12<span class="amount-frac">.50</span></a></div></td>
            <td style="display:var(--coldp-status,table-cell)"><div class="pr-cell"><a href="/account/ad/12345/edit_status">Active</a></div></td>
          </tr>
        </tbody>
      </table>
    `);

    expect(dailyStats.get('2026-01-16')).toMatchObject({
      impressions: 1000,
      clicks: 25,
      conversions: 3,
    });
    expect(dailyBudget.get('2026-01-16')?.costMicros).toBe(1_234_560);
    expect(monthly).toEqual([
      {
        statMonth: '202606',
        adId: '187',
        adTitle: 'TG Ad A',
        impressions: 999,
        clicks: 0,
        costMicros: 40_200,
        conversions: 0,
      },
    ]);
    expect(accountHourlyStats).toEqual([
      {
        bucketStartUtc: '2026-06-09T02:00:00.000Z',
        statDate: '2026-06-09',
        statHour: 2,
        impressions: 120,
        clicks: 13,
        conversions: 1,
      },
    ]);
    expect(accountHourlyBudget).toEqual([
      {
        bucketStartUtc: '2026-06-09T02:00:00.000Z',
        statDate: '2026-06-09',
        statHour: 2,
        costMicros: 1_200,
      },
    ]);
    expect(adDailyReport).toEqual([
      {
        adId: '187',
        statDate: '2026-01-16',
        impressions: 1000,
        costMicros: 1_234_560,
      },
    ]);
    expect(adStats).toEqual([
      {
        adId: '187',
        statDate: '2026-01-16',
        impressions: 1000,
        clicks: 25,
        conversions: 3,
      },
      {
        adId: '187',
        statDate: '2026-01-17',
        impressions: 500,
        clicks: 10,
        conversions: 1,
      },
    ]);
    expect(hourlyStats).toEqual([
      {
        adId: '187',
        bucketStartUtc: '2026-06-09T02:00:00.000Z',
        statDate: '2026-06-09',
        statHour: 2,
        impressions: 120,
        clicks: 13,
        conversions: 1,
      },
    ]);
    expect(hourlyBudget).toEqual([
      {
        adId: '187',
        bucketStartUtc: '2026-06-09T02:00:00.000Z',
        statDate: '2026-06-09',
        statHour: 2,
        costMicros: 1_200,
      },
    ]);
    expect(ads[0]).toMatchObject({
      adId: '12345',
      adTitle: 'TG Ad A',
      adStatus: 'Active',
      currentBudgetMicros: 12_500_000,
      cpmMicros: 300_000,
    });
  });

  it('keeps raw five-minute rows available while hourly parsers return complete hours only', () => {
    const csv = [
      'date\tViews\tClicks\tJoined',
      ...Array.from({ length: 11 }, (_, index) => `09 June 2026 2:${String(index * 5).padStart(2, '0')} UTC\t10\t1\t0`),
    ].join('\n');

    expect(parseTelegramAdsAdFiveMinuteStatsCsv('187', csv)).toHaveLength(11);
    expect(parseTelegramAdsAdHourlyStatsCsv('187', csv)).toEqual([]);

    const accountCsv = csv.replace('Joined', 'Actions');
    expect(parseTelegramAdsAccountFiveMinuteStatsCsv(accountCsv)).toHaveLength(11);
    expect(parseTelegramAdsAccountHourlyStatsCsv(accountCsv)).toEqual([]);
  });

  it('fails clearly when required columns are missing', () => {
    expect(() => parseTelegramAdsAdDailyStatsCsv('187', 'date\tViews\tClicks\n16 Jan 2026\t1000\t25\n')).toThrow(
      'Telegram Ads CSV missing column Joined',
    );
    expect(() => parseTelegramAdsDailyStatsCsv('date\tViews\tActions\n16 Jan 2026\t1000\t3\n')).toThrow(
      'Telegram Ads CSV missing column Clicks',
    );
  });

  it('fails when report rows and stats rows do not match', () => {
    const reportRows = parseTelegramAdsAdDailyReportCsv('187', 'Day\tViews\tAmount, TON\n16 January 2026\t1000\t1.23456\n');
    const statsRows = parseTelegramAdsAdDailyStatsCsv('187', 'date\tViews\tClicks\tJoined\n17 Jan 2026\t500\t10\t1\n');

    expect(() => mergeAdDailyRows(reportRows, statsRows)).toThrow(
      'Telegram Ads ad daily stats missing for ad 187 date 2026-01-16',
    );
  });

  it('parses GET-only account and ad page snapshots', () => {
    const adDetail = parseTelegramAdsAdDetailPage('205', `
      <title>Nange3 - Telegram Ads</title>
      <a href="/account/ad/205/stats">Statistics</a>
      <form class="pr-form js-ad-form">
        <input name="title" value="Nange3">
        <textarea name="text">Ad body</textarea>
        <input name="promote_url" value="t.me/example">
        <input name="website_name" value="Example">
        <input name="cpm" value="0.30">
        <input name="daily_budget" value="1.25">
        <input type="radio" name="views_per_user" value="2" checked>
        <input type="radio" name="active" value="1" checked>
        <input name="ad_activate_date" value="2026-06-10">
        <input name="ad_activate_time" value="15:51">
        <input type="checkbox" name="use_schedule" value="1" checked>
        <input name="schedule" value="111">
        <input name="schedule_tz" value="UTC">
        <input name="target_type" value="channels">
        <span data-val="channel_a"></span><span data-val="channel_b"></span>
        <button type="submit">Save Changes</button>
      </form>
    `);
    const stats = parseTelegramAdsAdStatsPage('tg_account_token_1234', '205', `
      <title>Nange3 - Telegram Ads</title>
      <a href="/account/ad/205/stats/share">Share Stats</a>
      <a href="/reports/account/tg_account_token_1234/ad/205?month=202606">CSV</a>
      <table><tr><th>Day</th><th>Views</th></tr><tr><td>Total in Jun 2026</td><td>0</td></tr></table>
    `);
    const budget = parseTelegramAdsAccountBudgetPage(`
      <a href="/account/budget">TON 19.00</a>
      <a href="/account/budget?offset=0&limit=5">1</a>
      <table>
        <tr><td>Transfer to the ad Nange3</td><td>- TON 1.00</td><td>Jun 10 at 15:51</td></tr>
        <tr><td>Payment: Ref#123</td><td>+ TON 30.00</td><td>Jun 9 at 14:56</td></tr>
      </table>
    `, 0, 5);
    const accountEdit = parseTelegramAdsAccountEditPage(`
      <form class="pr-form account-edit-form">
        <input name="full_name" value="Example User">
        <input name="email" value="sarah@example.com">
        <input name="phone_number" value="+1000">
        <input name="country" value="US">
        <input name="city" value="NYC">
        <textarea name="ad_info">Legal name</textarea>
        <button type="submit">Save Info</button>
      </form>
    `);
    const adBudget = parseTelegramAdsAdBudgetPage('205', `
      <title>Nange3 - Telegram Ads</title>
      <form class="pr-form">
        <input name="owner_id" value="tg_account_token_1234">
        <input name="ad_id" value="205">
        <input name="amount" value="1.00">
        <input name="decr_amount" value="0.25">
        <button type="submit">Add to budget</button>
      </form>
    `);
    const adEdit = parseTelegramAdsAdEditPage('205', 'status', `
      <title>Nange3 - Telegram Ads</title>
      <form class="pr-popup-edit-form">
        <input name="ad_id" value="205">
        <input type="radio" name="active" value="1" checked>
        <input type="radio" name="active" value="0">
      </form>
    `);

    expect(adDetail.fields).toMatchObject({
      title: 'Nange3',
      text: 'Ad body',
      promoteUrl: 't.me/example',
      cpmMicros: 300_000,
      dailyBudgetMicros: 1_250_000,
      viewsPerUser: 2,
      active: true,
      usesSchedule: true,
      targetCount: 2,
    });
    expect(adDetail.form.method).toBe('get');
    expect(stats.reportLinks).toEqual([
      {
        href: '/reports/account/tg_account_token_1234/ad/205?month=202606',
        text: 'CSV',
      },
    ]);
    expect(stats.shareStatsPath).toBe('/account/ad/205/stats/share');
    expect(budget).toMatchObject({
      offset: 0,
      limit: 5,
      balanceMicros: 19_000_000,
      transactions: [
        {
          description: 'Transfer to the ad Nange3',
          amountMicros: 1_000_000,
          direction: 'debit',
          occurredAtText: 'Jun 10 at 15:51',
        },
        {
          description: 'Payment: Ref#123',
          amountMicros: 30_000_000,
          direction: 'credit',
          occurredAtText: 'Jun 9 at 14:56',
        },
      ],
    });
    expect(accountEdit.fields).toMatchObject({
      fullName: 'Example User',
      email: 'sarah@example.com',
      phoneNumber: '+1000',
      country: 'US',
      city: 'NYC',
      adInfo: 'Legal name',
    });
    expect(adBudget.fields).toMatchObject({
      ownerId: 'tg_account_token_1234',
      adId: '205',
      amountMicros: 1_000_000,
      decreaseAmountMicros: 250_000,
    });
    expect(adEdit).toMatchObject({
      adId: '205',
      section: 'status',
      fields: {
        ad_id: '205',
        active: true,
      },
    });
  });
});
