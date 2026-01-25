-- Function for daily page views aggregation (avoids 1000 row limit)
CREATE OR REPLACE FUNCTION get_daily_page_views(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  view_date DATE,
  view_count BIGINT,
  unique_sessions BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow super admins to execute
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Access denied: Super admin required';
  END IF;

  RETURN QUERY
  SELECT 
    DATE(pv.created_at) as view_date,
    COUNT(*) as view_count,
    COUNT(DISTINCT pv.session_id) as unique_sessions
  FROM page_views pv
  WHERE pv.created_at > NOW() - (days_back || ' days')::INTERVAL
  GROUP BY DATE(pv.created_at)
  ORDER BY DATE(pv.created_at);
END;
$$;

-- Function for page analytics aggregation
CREATE OR REPLACE FUNCTION get_page_analytics(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  page_path TEXT,
  page_title TEXT,
  view_count BIGINT,
  unique_sessions BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow super admins to execute
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Access denied: Super admin required';
  END IF;

  RETURN QUERY
  SELECT 
    pv.page_path,
    MAX(pv.page_title) as page_title,
    COUNT(*) as view_count,
    COUNT(DISTINCT pv.session_id) as unique_sessions
  FROM page_views pv
  WHERE pv.created_at > NOW() - (days_back || ' days')::INTERVAL
  GROUP BY pv.page_path
  ORDER BY COUNT(*) DESC
  LIMIT 50;
END;
$$;

-- Function for blog views analytics aggregation
CREATE OR REPLACE FUNCTION get_blog_analytics(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  post_id UUID,
  view_count BIGINT,
  unique_sessions BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow super admins to execute
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Access denied: Super admin required';
  END IF;

  RETURN QUERY
  SELECT 
    bv.post_id,
    COUNT(*) as view_count,
    COUNT(DISTINCT bv.session_id) as unique_sessions
  FROM blog_views bv
  WHERE bv.created_at > NOW() - (days_back || ' days')::INTERVAL
  GROUP BY bv.post_id
  ORDER BY COUNT(*) DESC;
END;
$$;

-- Function for page view counts (exact counts without fetching rows)
CREATE OR REPLACE FUNCTION get_page_view_counts()
RETURNS TABLE (
  today_views BIGINT,
  week_views BIGINT,
  month_views BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today TIMESTAMP := date_trunc('day', NOW());
  v_week TIMESTAMP := NOW() - INTERVAL '7 days';
  v_month TIMESTAMP := NOW() - INTERVAL '30 days';
BEGIN
  -- Only allow super admins to execute
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Access denied: Super admin required';
  END IF;

  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM page_views WHERE created_at >= v_today) as today_views,
    (SELECT COUNT(*) FROM page_views WHERE created_at >= v_week) as week_views,
    (SELECT COUNT(*) FROM page_views WHERE created_at >= v_month) as month_views;
END;
$$;

-- Grant execute permissions to authenticated users (RLS in function handles access)
GRANT EXECUTE ON FUNCTION get_daily_page_views TO authenticated;
GRANT EXECUTE ON FUNCTION get_page_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_blog_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_page_view_counts TO authenticated;