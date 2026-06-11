import {
  mergeAdDailyRows,
  parseTelegramAdsAccountAds,
  parseTelegramAdsAdDailyReportCsv,
  parseTelegramAdsAdDailyStatsCsv,
  parseTelegramAdsAdFiveMinuteStatsCsv,
  parseTelegramAdsAdHourlyBudgetCsv,
  parseTelegramAdsAdHourlyStatsCsv,
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
});

