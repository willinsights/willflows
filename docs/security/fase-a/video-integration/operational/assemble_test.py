"""Inspect the operator's actual assembly output; no database access."""
import unittest
from assemble_coordinated import coordinated_sql
from assemble_candidate import ACCOUNTING_LOCK

class AssemblyTests(unittest.TestCase):
    def test_lock_order_and_single_transaction(self):
        sql=coordinated_sql()
        self.assertEqual(sql.count('SELECT willflow_video_control.activate_coordinated();'),1)
        self.assertLess(sql.index(ACCOUNTING_LOCK),sql.index('SELECT willflow_video_control.activate_coordinated();'))
        self.assertLess(sql.index('SELECT willflow_video_control.activate_coordinated();'),sql.index('DO $integrity$'))
        self.assertTrue(sql.startswith('BEGIN;\n'))
        self.assertTrue(sql.endswith('COMMIT;\n'))

if __name__=='__main__':
    unittest.main()