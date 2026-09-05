-- SIGNAL Database Seed Data

INSERT INTO instruments (symbol, name, exchange, sector, industry, lot_size, base_price, average_daily_volume, baseline_volatility, market_cap_category, benchmark_symbol)
VALUES
('INFY', 'Infosys Limited', 'NSE', 'Information Technology', 'IT Services', 400, 1542.30, 7800000, 0.0160, 'LARGE_CAP', 'NIFTYIT'),
('TCS', 'Tata Consultancy Services Ltd', 'NSE', 'Information Technology', 'IT Services', 175, 3421.50, 2400000, 0.0140, 'LARGE_CAP', 'NIFTYIT'),
('RELIANCE', 'Reliance Industries Ltd', 'NSE', 'Energy & Petrochemicals', 'Oil & Gas', 250, 1421.20, 9200000, 0.0150, 'LARGE_CAP', 'NIFTY50'),
('HDFCBANK', 'HDFC Bank Limited', 'NSE', 'Banking & Financials', 'Private Bank', 550, 1890.10, 12500000, 0.0130, 'LARGE_CAP', 'NIFTYBANK'),
('ICICIBANK', 'ICICI Bank Limited', 'NSE', 'Banking & Financials', 'Private Bank', 700, 1265.40, 11000000, 0.0150, 'LARGE_CAP', 'NIFTYBANK'),
('TATAMOTORS', 'Tata Motors Limited', 'NSE', 'Automobile', 'Commercial & EV', 725, 712.80, 14200000, 0.0220, 'LARGE_CAP', 'NIFTYAUTO')
ON CONFLICT (symbol) DO NOTHING;
